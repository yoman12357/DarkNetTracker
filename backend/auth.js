import {
  createAuthToken,
  findUserByToken,
  findUserByUsername,
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
  };
  next();
}

export function login(username, password) {
  const user = findUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  return {
    token: createAuthToken(user.id),
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}
