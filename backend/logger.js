/**
 * Logging System for DARK Backend
 * Provides structured logging for debugging, auditing, and monitoring
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "./config.js";
import { recordRequestMetric } from "./metrics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = config.logsDir;

// Ensure logs directory exists
fs.mkdirSync(logsDir, { recursive: true });

const LogLevel = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
};

function formatTimestamp(date = new Date()) {
  return date.toISOString();
}

function formatLogEntry(level, message, data = {}) {
  return JSON.stringify({
    timestamp: formatTimestamp(),
    service: "darknettracker-backend",
    env: config.env,
    level,
    message,
    ...data,
  });
}

function writeLog(level, message, data = {}) {
  const logEntry = formatLogEntry(level, message, data);

  // Log to console in development
  if (process.env.NODE_ENV !== "production") {
    const colors = {
      DEBUG: "\x1b[36m", // Cyan
      INFO: "\x1b[32m", // Green
      WARN: "\x1b[33m", // Yellow
      ERROR: "\x1b[31m", // Red
      RESET: "\x1b[0m",
    };
    console.log(`${colors[level]}[${level}]${colors.RESET} ${message}`, data);
  }

  // Log to file
  const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
  try {
    fs.appendFileSync(logFile, logEntry + "\n");
  } catch (err) {
    console.error("Failed to write to log file:", err);
  }
}

export const logger = {
  debug: (message, data) => writeLog(LogLevel.DEBUG, message, data),
  info: (message, data) => writeLog(LogLevel.INFO, message, data),
  warn: (message, data) => writeLog(LogLevel.WARN, message, data),
  error: (message, data) => writeLog(LogLevel.ERROR, message, data),
};

// Express middleware for request logging
export function requestLogger(req, res, next) {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 400 ? "WARN" : "INFO";

    logger[logLevel === "WARN" ? "warn" : "info"]("HTTP Request", {
      method: req.method,
      path: req.path,
      statusCode,
      durationMs: duration,
      userAgent: req.get("user-agent"),
      ip: req.ip,
      requestId: req.id,
      userId: req.user?.id || "anonymous",
    });
    recordRequestMetric({ method: req.method, statusCode });

    return originalJson(data);
  };

  next();
}

// Error logging wrapper
export function logError(error, context = {}) {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...context,
  });
}

// Session event logging
export function logSessionEvent(eventType, sessionId, data = {}) {
  logger.info(`Session: ${eventType}`, {
    sessionId,
    ...data,
  });
}

// Authentication event logging
export function logAuthEvent(eventType, username, data = {}) {
  logger.info(`Auth: ${eventType}`, {
    username,
    ...data,
  });
}

// Admin action logging
export function logAdminAction(action, userId, username, data = {}) {
  logger.info(`Admin: ${action}`, {
    userId,
    username,
    ...data,
  });
}
