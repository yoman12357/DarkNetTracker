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
const tokenTtlHours = Number(process.env.AUTH_TOKEN_TTL_HOURS ?? 8);

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
    expires_at TEXT,
    revoked_at TEXT,
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

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_username TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON jobs(status, created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
`);

for (const statement of [
  "ALTER TABLE auth_tokens ADD COLUMN expires_at TEXT",
  "ALTER TABLE auth_tokens ADD COLUMN revoked_at TEXT",
]) {
  try {
    db.exec(statement);
  } catch {
    // Column already exists on newer databases.
  }
}

const defaultUsername = process.env.APP_DEFAULT_USER ?? "admin";
const defaultPassword = process.env.APP_DEFAULT_PASS ?? "admin123";
const analystUsername = process.env.APP_ANALYST_USER ?? "analyst";
const analystPassword = process.env.APP_ANALYST_PASS ?? "analyst123";
const viewerUsername = process.env.APP_VIEWER_USER ?? "viewer";
const viewerPassword = process.env.APP_VIEWER_PASS ?? "viewer123";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function ensureUser({ username, password, role }) {
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return;
  }

  db.prepare(
    "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(
    `user_${crypto.randomUUID()}`,
    username,
    hashPassword(password),
    role,
    new Date().toISOString(),
  );
}

function ensureDefaultUsers() {
  ensureUser({
    username: defaultUsername,
    password: defaultPassword,
    role: "admin",
  });
  ensureUser({
    username: analystUsername,
    password: analystPassword,
    role: "analyst",
  });
  ensureUser({
    username: viewerUsername,
    password: viewerPassword,
    role: "viewer",
  });
}

ensureDefaultUsers();

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

export function listDemoAccounts() {
  return [
    { username: defaultUsername, password: defaultPassword, role: "admin" },
    { username: analystUsername, password: analystPassword, role: "analyst" },
    { username: viewerUsername, password: viewerPassword, role: "viewer" },
  ];
}

export function listUsers() {
  return db
    .prepare(
      `
        SELECT id, username, role, created_at
        FROM users
        ORDER BY created_at ASC
      `,
    )
    .all()
    .map((row) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      createdAt: row.created_at,
    }));
}

export function listAuditLogs(limit = 150) {
  return db
    .prepare(
      `
        SELECT id, actor_id, actor_username, action, target_type, target_id, metadata_json, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT ?
      `,
    )
    .all(limit)
    .map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      actorUsername: row.actor_username,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      metadata: parseJson(row.metadata_json, {}),
      createdAt: row.created_at,
    }));
}

export function recordAuditEvent({
  actorId = null,
  actorUsername = null,
  action,
  targetType,
  targetId = null,
  metadata = {},
}) {
  db.prepare(
    `
      INSERT INTO audit_logs (id, actor_id, actor_username, action, target_type, target_id, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    `audit_${crypto.randomUUID()}`,
    actorId,
    actorUsername,
    action,
    targetType,
    targetId,
    JSON.stringify(metadata ?? {}),
    new Date().toISOString(),
  );
}

export function createUserAccount({ username, password, role }) {
  if (!username || !password || !role) {
    throw new Error("username, password, and role are required");
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    throw new Error("A user with that username already exists");
  }

  const id = `user_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  db.prepare(
    `
      INSERT INTO users (id, username, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
  ).run(id, username, hashPassword(password), role, createdAt);

  return {
    id,
    username,
    role,
    createdAt,
  };
}

export function updateUserAccount(id, { role, password }) {
  const current = db
    .prepare("SELECT id, username, role, created_at, password_hash FROM users WHERE id = ?")
    .get(id);
  if (!current) {
    throw new Error("User not found");
  }

  const nextRole = role ?? current.role;
  const nextPasswordHash = password ? hashPassword(password) : current.password_hash;
  db.prepare(
    `
      UPDATE users
      SET role = ?, password_hash = ?
      WHERE id = ?
    `,
  ).run(nextRole, nextPasswordHash, id);

  return {
    id: current.id,
    username: current.username,
    role: nextRole,
    createdAt: current.created_at,
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
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + tokenTtlHours * 60 * 60 * 1000);
  db.prepare(
    "INSERT INTO auth_tokens (token, user_id, created_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, NULL)",
  ).run(token, userId, createdAt.toISOString(), expiresAt.toISOString());
  return {
    token,
    expiresAt: expiresAt.toISOString(),
    expiresInHours: tokenTtlHours,
  };
}

export function findUserByToken(token) {
  const row = db
    .prepare(
      `
        SELECT users.*, auth_tokens.expires_at, auth_tokens.revoked_at
        FROM auth_tokens
        JOIN users ON users.id = auth_tokens.user_id
        WHERE auth_tokens.token = ?
      `,
    )
    .get(token);

  if (!row) {
    return null;
  }

  if (row.revoked_at) {
    return null;
  }

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    revokeAuthToken(token);
    return null;
  }

  return row;
}

export function revokeAuthToken(token) {
  db.prepare(
    `
      UPDATE auth_tokens
      SET revoked_at = ?
      WHERE token = ? AND revoked_at IS NULL
    `,
  ).run(new Date().toISOString(), token);
}

export function cleanupExpiredTokens() {
  db.prepare(
    `
      UPDATE auth_tokens
      SET revoked_at = COALESCE(revoked_at, ?)
      WHERE expires_at IS NOT NULL
        AND expires_at <= ?
        AND revoked_at IS NULL
    `,
  ).run(new Date().toISOString(), new Date().toISOString());
}

export { dbPath };
