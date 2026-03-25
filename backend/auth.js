import {
  cleanupExpiredTokens,
  createAuthToken,
  findUserByToken,
  findUserByUsername,
  recordAuditEvent,
  revokeAuthToken,
  verifyPassword,
} from "./db.js";

function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return null;
}

export function requireAuth(req, res, next) {
  cleanupExpiredTokens();
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = findUserByToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    tokenExpiresAt: user.expires_at ?? null,
  };
  req.authToken = token;
  next();
}

export function requireRole(allowedRoles) {
  const allowed = new Set(allowedRoles);
  return function roleGuard(req, res, next) {
    if (!req.user || !allowed.has(req.user.role)) {
      res.status(403).json({
        error: "Insufficient permissions",
        requiredRoles: [...allowed],
      });
      return;
    }
    next();
  };
}

export function login(username, password) {
  const user = findUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    recordAuditEvent({
      actorUsername: username,
      action: "auth.login.failed",
      targetType: "user",
      targetId: null,
      metadata: { reason: "invalid_credentials" },
    });
    return null;
  }

  const authToken = createAuthToken(user.id);
  recordAuditEvent({
    actorId: user.id,
    actorUsername: user.username,
    action: "auth.login.success",
    targetType: "user",
    targetId: user.id,
    metadata: { role: user.role, expiresAt: authToken.expiresAt },
  });

  return {
    token: authToken.token,
    expiresAt: authToken.expiresAt,
    expiresInHours: authToken.expiresInHours,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

export function logout(token, user) {
  if (!token) {
    return;
  }
  revokeAuthToken(token);
  recordAuditEvent({
    actorId: user?.id ?? null,
    actorUsername: user?.username ?? null,
    action: "auth.logout",
    targetType: "token",
    targetId: token,
    metadata: {},
  });
}
