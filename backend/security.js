import crypto from "node:crypto";
import path from "node:path";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { config } from "./config.js";

const uploadExtensionsByMode = {
  replay: new Set([".jsonl", ".json", ".csv"]),
  pcap: new Set([".pcap", ".pcapng"]),
};

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(256),
});

const simulateSchema = z.object({
  sessions: z.number().int().min(1).max(1000).default(18),
  seed: z.number().int().min(0).max(2 ** 31 - 1).default(7),
  topK: z.number().int().min(1).max(50).default(8),
  writeLogs: z.boolean().default(false),
});

const liveSchema = z.object({
  interfaceName: z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9._-]+$/).default("any"),
  captureSeconds: z.number().int().min(1).max(3600).default(8),
  topK: z.number().int().min(1).max(50).default(8),
  writeLogs: z.boolean().default(false),
});

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(12).max(256),
  role: z.enum(["admin", "analyst", "viewer"]),
});

const updateUserSchema = z.object({
  role: z.enum(["admin", "analyst", "viewer"]).optional(),
  password: z.string().min(12).max(256).optional(),
});

function buildOriginSet() {
  return new Set(config.allowedOrigins);
}

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "connect-src": ["'self'", ...config.allowedOrigins, "ws:", "wss:"],
      "img-src": ["'self'", "data:", "blob:"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: config.isProduction,
});

export const corsOptions = {
  origin(origin, callback) {
    const allowedOrigins = buildOriginSet();
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"],
  exposedHeaders: ["X-Request-Id"],
};

export const createRateLimiter = () =>
  rateLimit({
    windowMs: config.requestLimitWindowMs,
    max: config.requestLimitMax,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

export const authLimiter = rateLimit({
  windowMs: config.requestLimitWindowMs,
  max: config.authLimitMax,
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many file uploads, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export function sanitizeFilename(filename) {
  const base = path.basename(String(filename ?? "upload"));
  return base
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120);
}

export function validateUploadSize(maxSizeBytes = config.uploadLimitBytes) {
  return (req, res, next) => {
    const contentLength = Number.parseInt(req.headers["content-length"], 10);
    if (Number.isFinite(contentLength) && contentLength > maxSizeBytes) {
      res.status(413).json({
        error: `File too large. Maximum size is ${Math.floor(maxSizeBytes / (1024 * 1024))}MB`,
      });
      return;
    }
    next();
  };
}

export function validateUploadFile(mode) {
  return (req, _res, cb) => {
    const extension = path.extname(req.file?.originalname ?? req.originalname ?? "").toLowerCase();
    const allowedExtensions = uploadExtensionsByMode[mode];

    if (!allowedExtensions?.has(extension)) {
      cb(new Error(`Unsupported file extension for ${mode}: ${extension || "unknown"}`));
      return;
    }

    cb(null, true);
  };
}

export function requireUploadExtension(mode) {
  return (req, res, next) => {
    const filename = req.file?.originalname ?? "";
    const extension = path.extname(filename).toLowerCase();
    const allowedExtensions = uploadExtensionsByMode[mode];

    if (!allowedExtensions?.has(extension)) {
      res.status(400).json({ error: `Unsupported file extension for ${mode}: ${extension || "unknown"}` });
      return;
    }

    next();
  };
}

export function createCsrfToken(authToken) {
  return crypto.createHmac("sha256", config.csrfSecret).update(String(authToken)).digest("hex");
}

export function requireCsrfProtection(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedOrigins = buildOriginSet();

  if (origin && !allowedOrigins.has(origin)) {
    res.status(403).json({ error: "Cross-site request blocked" });
    return;
  }

  if (!origin && referer) {
    const refererOrigin = new URL(referer).origin;
    if (!allowedOrigins.has(refererOrigin)) {
      res.status(403).json({ error: "Cross-site referer blocked" });
      return;
    }
  }

  const token = req.authToken;
  const csrfHeader = req.get("x-csrf-token");
  if (!token || !csrfHeader || csrfHeader !== createCsrfToken(token)) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }

  next();
}

export function validateRequest(schema, source = "body") {
  return (req, res, next) => {
    const target = req[source] ?? {};
    const parsed = schema.safeParse(target);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }
    req[source] = parsed.data;
    next();
  };
}

export const validateLoginBody = validateRequest(loginSchema);
export const validateSessionBody = validateRequest(simulateSchema);
export const validateLiveSessionBody = validateRequest(liveSchema);
export const validateCreateUserBody = validateRequest(createUserSchema);
export const validateUpdateUserBody = validateRequest(updateUserSchema);
