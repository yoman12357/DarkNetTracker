import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import { config } from "./config.js";
import { runMigrations } from "./migrations.js";

const db = new DatabaseSync(config.dbPath);
const tokenTtlHours = config.authTokenTtlHours;

runMigrations(db);

const defaultUsername = config.defaults.adminUser;
const defaultPassword = config.defaults.adminPass;
const analystUsername = config.defaults.analystUser;
const analystPassword = config.defaults.analystPass;
const viewerUsername = config.defaults.viewerUser;
const viewerPassword = config.defaults.viewerPass;

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

export function getOperationalStats() {
  const [users, sessions, jobs, auditLogs] = [
    db.prepare("SELECT COUNT(*) AS total FROM users").get(),
    db.prepare("SELECT COUNT(*) AS total FROM sessions").get(),
    db.prepare("SELECT COUNT(*) AS total FROM jobs").get(),
    db.prepare("SELECT COUNT(*) AS total FROM audit_logs").get(),
  ];

  return {
    users: Number(users?.total ?? 0),
    sessions: Number(sessions?.total ?? 0),
    jobs: Number(jobs?.total ?? 0),
    auditLogs: Number(auditLogs?.total ?? 0),
  };
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
      INSERT INTO jobs (
        id,
        session_id,
        status,
        created_at,
        started_at,
        finished_at,
        attempt_count,
        max_attempts,
        last_error,
        lease_expires_at
      )
      VALUES (?, ?, ?, ?, NULL, NULL, 0, ?, NULL, NULL)
    `,
  ).run(id, sessionId, status, new Date().toISOString(), config.pythonMaxRetries);
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
      attemptCount: row.attempt_count ?? 0,
      maxAttempts: row.max_attempts ?? 2,
      lastError: row.last_error ?? null,
      leaseExpiresAt: row.lease_expires_at ?? null,
      mode: row.mode,
      inputLabel: row.input_label,
      config: parseJson(row.config_json, {}),
    }));
}

export function hasQueuedJobs() {
  const row = db
    .prepare("SELECT COUNT(*) AS total FROM jobs WHERE status = 'queued'")
    .get();
  return Number(row?.total ?? 0) > 0;
}

export function recoverStaleRunningJobs(referenceTime = new Date().toISOString()) {
  db.prepare(
    `
      UPDATE jobs
      SET status = 'queued',
          lease_expires_at = NULL,
          last_error = COALESCE(last_error, 'Recovered after stale running lease')
      WHERE status = 'running'
        AND lease_expires_at IS NOT NULL
        AND lease_expires_at <= ?
    `,
  ).run(referenceTime);
}

export function claimNextQueuedJob({ leaseExpiresAt, startedAt }) {
  const next = db
    .prepare(
      `
        SELECT jobs.id
        FROM jobs
        WHERE jobs.status = 'queued'
        ORDER BY jobs.created_at ASC
        LIMIT 1
      `,
    )
    .get();

  if (!next) {
    return null;
  }

  const result = db.prepare(
    `
      UPDATE jobs
      SET status = 'running',
          started_at = COALESCE(started_at, ?),
          attempt_count = COALESCE(attempt_count, 0) + 1,
          lease_expires_at = ?,
          last_error = NULL
      WHERE id = ? AND status = 'queued'
    `,
  ).run(startedAt, leaseExpiresAt, next.id);

  if (!result.changes) {
    return null;
  }

  return db
    .prepare(
      `
        SELECT jobs.*, sessions.mode, sessions.input_label, sessions.config_json
        FROM jobs
        JOIN sessions ON sessions.id = jobs.session_id
        WHERE jobs.id = ?
      `,
    )
    .get(next.id);
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
      SET status = ?, started_at = ?, finished_at = ?, last_error = ?, lease_expires_at = ?
      WHERE id = ?
    `,
  ).run(
    updated.status,
    updated.startedAt ?? updated.started_at ?? null,
    updated.finishedAt ?? updated.finished_at ?? null,
    updated.lastError ?? updated.last_error ?? null,
    updated.leaseExpiresAt ?? updated.lease_expires_at ?? null,
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

export const dbPath = config.dbPath;
