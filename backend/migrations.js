function tableExists(db, tableName) {
  const result = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  return Boolean(result);
}

function columnExists(db, tableName, columnName) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return rows.some((row) => row.name === columnName);
}

const migrations = [
  {
    id: "001_initial_schema",
    up(db) {
      db.exec(`
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
    },
  },
  {
    id: "002_job_retries_and_token_expiry",
    up(db) {
      if (!columnExists(db, "jobs", "attempt_count")) {
        db.exec("ALTER TABLE jobs ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0");
      }
      if (!columnExists(db, "jobs", "max_attempts")) {
        db.exec("ALTER TABLE jobs ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 2");
      }
      if (!columnExists(db, "jobs", "last_error")) {
        db.exec("ALTER TABLE jobs ADD COLUMN last_error TEXT");
      }
      if (!columnExists(db, "jobs", "lease_expires_at")) {
        db.exec("ALTER TABLE jobs ADD COLUMN lease_expires_at TEXT");
      }
      if (!columnExists(db, "auth_tokens", "expires_at")) {
        db.exec("ALTER TABLE auth_tokens ADD COLUMN expires_at TEXT");
      }
      if (!columnExists(db, "auth_tokens", "revoked_at")) {
        db.exec("ALTER TABLE auth_tokens ADD COLUMN revoked_at TEXT");
      }
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_jobs_lease_expires_at ON jobs(lease_expires_at);
      `);
    },
  },
];

export function runMigrations(db, logger = console) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare("SELECT id FROM schema_migrations ORDER BY applied_at ASC").all().map((row) => row.id),
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }
    migration.up(db);
    db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
      migration.id,
      new Date().toISOString(),
    );
    logger.info?.("Applied database migration", { migrationId: migration.id });
  }

  if (!tableExists(db, "schema_migrations")) {
    throw new Error("Database migration bootstrap failed.");
  }
}
