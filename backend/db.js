import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "app.db");

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    input_label TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    finished_at TEXT,
    config_json TEXT NOT NULL,
    result_json TEXT,
    error TEXT
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );
`);

const defaultUsername = process.env.APP_DEFAULT_USER ?? "admin";
const defaultPassword = process.env.APP_DEFAULT_PASS ?? "admin123";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function ensureDefaultUser() {
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(defaultUsername);
  if (existing) {
    return;
  }

  db.prepare(
    "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(
    `user_${crypto.randomUUID()}`,
    defaultUsername,
    hashPassword(defaultPassword),
    "admin",
    new Date().toISOString(),
  );
}

ensureDefaultUser();

function parseJson(value, fallback = null) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toSession(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    mode: row.mode,
    inputLabel: row.input_label,
    status: row.status,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    config: parseJson(row.config_json, {}),
    result: parseJson(row.result_json, null),
    error: row.error,
  };
}

export function getDefaultCredentials() {
  return {
    username: defaultUsername,
    password: defaultPassword,
  };
}

export function listSessions() {
  return db
    .prepare("SELECT * FROM sessions ORDER BY created_at DESC")
    .all()
    .map(toSession);
}

export function getSessionById(id) {
  return toSession(db.prepare("SELECT * FROM sessions WHERE id = ?").get(id));
}

export function createSession({ id, mode, inputLabel, status, config }) {
  db.prepare(
    `
      INSERT INTO sessions (id, mode, input_label, status, created_at, finished_at, config_json, result_json, error)
      VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL)
    `,
  ).run(id, mode, inputLabel, status, new Date().toISOString(), JSON.stringify(config));
  return getSessionById(id);
}

export function updateSession(id, patch) {
  const current = getSessionById(id);
  if (!current) {
    return null;
  }

  const updated = { ...current, ...patch };
  db.prepare(
    `
      UPDATE sessions
      SET status = ?, finished_at = ?, config_json = ?, result_json = ?, error = ?
      WHERE id = ?
    `,
  ).run(
    updated.status,
    updated.finishedAt ?? null,
    JSON.stringify(updated.config ?? {}),
    updated.result ? JSON.stringify(updated.result) : null,
    updated.error ?? null,
    id,
  );
  return getSessionById(id);
}

export function createJob({ id, sessionId, status }) {
  db.prepare(
    `
      INSERT INTO jobs (id, session_id, status, created_at, started_at, finished_at)
      VALUES (?, ?, ?, ?, NULL, NULL)
    `,
  ).run(id, sessionId, status, new Date().toISOString());
}

export function listQueuedJobs() {
  return db
    .prepare(
      `
        SELECT jobs.*, sessions.mode, sessions.input_label, sessions.config_json
        FROM jobs
        JOIN sessions ON sessions.id = jobs.session_id
        WHERE jobs.status = 'queued'
        ORDER BY jobs.created_at ASC
      `,
    )
    .all()
    .map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      status: row.status,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      mode: row.mode,
      inputLabel: row.input_label,
      config: parseJson(row.config_json, {}),
    }));
}

export function updateJob(id, patch) {
  const current = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  if (!current) {
    return null;
  }
  const updated = { ...current, ...patch };
  db.prepare(
    `
      UPDATE jobs
      SET status = ?, started_at = ?, finished_at = ?
      WHERE id = ?
    `,
  ).run(
    updated.status,
    updated.startedAt ?? updated.started_at ?? null,
    updated.finishedAt ?? updated.finished_at ?? null,
    id,
  );
  return db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
}

export function findUserByUsername(username) {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username);
}

export function verifyPassword(password, storedHash) {
  const [salt, expected] = storedHash.split(":");
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function createAuthToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare(
    "INSERT INTO auth_tokens (token, user_id, created_at) VALUES (?, ?, ?)",
  ).run(token, userId, new Date().toISOString());
  return token;
}

export function findUserByToken(token) {
  return db
    .prepare(
      `
        SELECT users.*
        FROM auth_tokens
        JOIN users ON users.id = auth_tokens.user_id
        WHERE auth_tokens.token = ?
      `,
    )
    .get(token);
}

export { dbPath };
