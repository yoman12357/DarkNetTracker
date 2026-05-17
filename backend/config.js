import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseBoolean(value, fallback = false) {
  if (value == null) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitList(value, fallback = []) {
  if (!value) {
    return fallback;
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const environment = process.env.NODE_ENV ?? "development";
const isProduction = environment === "production";
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(__dirname, "uploads");
const logsDir = path.join(rootDir, "logs");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
];
const allowedOrigins = Array.from(
  new Set([
    ...defaultOrigins,
    ...splitList(process.env.ALLOWED_ORIGINS),
  ]),
);

export const config = {
  env: environment,
  isProduction,
  host: process.env.HOST ?? "0.0.0.0",
  port: parseInteger(process.env.PORT, 4000),
  trustProxy: parseBoolean(process.env.TRUST_PROXY, isProduction),
  authTokenTtlHours: parseInteger(process.env.AUTH_TOKEN_TTL_HOURS, 8),
  requestLimitWindowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  requestLimitMax: parseInteger(process.env.RATE_LIMIT_MAX, 100),
  authLimitMax: parseInteger(process.env.AUTH_RATE_LIMIT_MAX, 5),
  uploadLimitBytes: parseInteger(process.env.UPLOAD_LIMIT_BYTES, 100 * 1024 * 1024),
  pythonCommand:
    process.env.PYTHON_EXECUTABLE ??
    (process.platform === "win32" ? "python" : "python3"),
  pythonTimeoutMs: parseInteger(process.env.PYTHON_TIMEOUT_MS, 5 * 60 * 1000),
  pythonMaxRetries: parseInteger(process.env.PYTHON_MAX_RETRIES, 2),
  dataDir,
  uploadsDir,
  logsDir,
  dbPath: path.join(dataDir, "app.db"),
  allowedOrigins,
  csrfSecret: process.env.CSRF_SECRET ?? "darknettracker-dev-csrf-secret",
  tls: {
    enabled: parseBoolean(process.env.TLS_ENABLED, false),
    keyPath: process.env.TLS_KEY_PATH ? path.resolve(rootDir, process.env.TLS_KEY_PATH) : null,
    certPath: process.env.TLS_CERT_PATH ? path.resolve(rootDir, process.env.TLS_CERT_PATH) : null,
  },
  defaults: {
    adminUser: process.env.APP_DEFAULT_USER ?? "admin",
    adminPass: process.env.APP_DEFAULT_PASS ?? "admin123",
    analystUser: process.env.APP_ANALYST_USER ?? "analyst",
    analystPass: process.env.APP_ANALYST_PASS ?? "analyst123",
    viewerUser: process.env.APP_VIEWER_USER ?? "viewer",
    viewerPass: process.env.APP_VIEWER_PASS ?? "viewer123",
  },
};

export function assertProductionConfig() {
  if (!config.isProduction) {
    return;
  }

  const demoPasswords = new Set(["admin123", "analyst123", "viewer123"]);
  const configuredPasswords = [
    config.defaults.adminPass,
    config.defaults.analystPass,
    config.defaults.viewerPass,
  ];

  if (configuredPasswords.some((password) => demoPasswords.has(password))) {
    throw new Error("Refusing to start in production with demo credentials configured.");
  }

  if (!config.allowedOrigins.length) {
    throw new Error("ALLOWED_ORIGINS must be configured in production.");
  }
}
