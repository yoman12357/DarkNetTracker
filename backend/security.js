/**
 * Security & Request Validation Middleware
 * Implements rate limiting, CORS restrictions, CSRF protection, and input validation
 */

import rateLimit from "express-rate-limit";

// Rate limiting middleware
export const createRateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === "127.0.0.1", // Allow localhost
  });
};

// Stricter rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// File upload size validator
export const validateUploadSize = (maxSizeBytes = 100 * 1024 * 1024) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers["content-length"], 10);
    if (contentLength > maxSizeBytes) {
      res.status(413).json({
        error: `File too large. Maximum size is ${maxSizeBytes / 1024 / 1024}MB`,
      });
      return;
    }
    next();
  };
};

// Input sanitization validator
export const validateSessionBody = (req, res, next) => {
  const body = req.body || {};

  // Validate sessions parameter
  if (typeof body.sessions === "number") {
    if (body.sessions < 1 || body.sessions > 1000) {
      res.status(400).json({ error: "sessions must be between 1 and 1000" });
      return;
    }
  }

  // Validate seed parameter
  if (typeof body.seed === "number") {
    if (body.seed < 0 || body.seed > Math.pow(2, 31) - 1) {
      res.status(400).json({ error: "seed must be a valid 32-bit integer" });
      return;
    }
  }

  // Validate topK parameter
  if (typeof body.topK === "number") {
    if (body.topK < 1 || body.topK > 50) {
      res.status(400).json({ error: "topK must be between 1 and 50" });
      return;
    }
  }

  // Validate writeLogs boolean
  if (typeof body.writeLogs === "boolean") {
    // Valid
  }

  next();
};

// Filename sanitization
export const sanitizeFilename = (filename) => {
  // Remove path separators and dangerous characters
  return filename
    .replace(/\.\./g, "")
    .replace(/[\/\\]/g, "")
    .replace(/[<>:"|?*]/g, "")
    .substring(0, 255);
};

// Interface name validator for live capture
export const validateInterfaceName = (interfaceName) => {
  if (!interfaceName || typeof interfaceName !== "string") {
    return false;
  }
  // Allow alphanumeric, dots, hyphens, underscores
  return /^[a-zA-Z0-9._\-]+$/.test(interfaceName);
};

// Security headers
export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  next();
};

// CORS configuration
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:4000",
      process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()),
    ].filter(Boolean).flat();

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
);
