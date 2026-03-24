import cors from "cors";
import express from "express";
import multer from "multer";
import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { login, requireAuth } from "./auth.js";
import {
  createSession,
  getDefaultCredentials,
  getSessionById,
  listSessions,
} from "./db.js";
import { enqueueSessionJob } from "./queue.js";
import { broadcastEvent, registerSocketUpgrade } from "./socketHub.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");

await fs.mkdir(uploadsDir, { recursive: true });

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

registerSocketUpgrade(server, wss);

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, safeName);
  },
});
const upload = multer({ storage });

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "traffic-correlation-backend",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/bootstrap", (_req, res) => {
  res.json({
    defaultUser: getDefaultCredentials(),
    capabilities: ["simulate", "replay", "pcap", "live"],
  });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const authSession = login(username, password);
  if (!authSession) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  res.json(authSession);
});

app.use("/api", requireAuth);

app.get("/api/sessions", (_req, res) => {
  res.json({ sessions: listSessions() });
});

app.get("/api/sessions/:sessionId", (req, res) => {
  const session = getSessionById(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

app.post("/api/sessions/simulate", (req, res) => {
  const {
    sessions = 18,
    seed = 7,
    topK = 8,
    writeLogs = false,
  } = req.body || {};

  const session = createSession({
    id: `sess_${crypto.randomUUID()}`,
    mode: "simulate",
    inputLabel: `simulation:${sessions}`,
    status: "queued",
    config: { sessions, seed, topK, writeLogs },
  });

  res.status(202).json(session);
  broadcastEvent({ type: "session.created", payload: session });
  enqueueSessionJob(session, broadcastEvent);
});

app.post("/api/sessions/replay", upload.single("dataset"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "dataset file is required" });
    return;
  }

  const topK = Number(req.body?.topK ?? 8);
  const writeLogs = String(req.body?.writeLogs ?? "false") === "true";
  const datasetPath = path.join(uploadsDir, req.file.filename);

  const session = createSession({
    id: `sess_${crypto.randomUUID()}`,
    mode: "replay",
    inputLabel: req.file.originalname,
    status: "queued",
    config: { datasetPath, topK, writeLogs },
  });

  res.status(202).json(session);
  broadcastEvent({ type: "session.created", payload: session });
  enqueueSessionJob(session, broadcastEvent);
});

app.post("/api/sessions/pcap", upload.single("dataset"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "pcap file is required" });
    return;
  }

  const topK = Number(req.body?.topK ?? 8);
  const writeLogs = String(req.body?.writeLogs ?? "false") === "true";
  const datasetPath = path.join(uploadsDir, req.file.filename);

  const session = createSession({
    id: `sess_${crypto.randomUUID()}`,
    mode: "pcap",
    inputLabel: req.file.originalname,
    status: "queued",
    config: { datasetPath, topK, writeLogs },
  });

  res.status(202).json(session);
  broadcastEvent({ type: "session.created", payload: session });
  enqueueSessionJob(session, broadcastEvent);
});

app.post("/api/sessions/live", (req, res) => {
  const {
    interfaceName = "any",
    captureSeconds = 8,
    topK = 8,
    writeLogs = false,
  } = req.body || {};

  const session = createSession({
    id: `sess_${crypto.randomUUID()}`,
    mode: "live",
    inputLabel: `live:${interfaceName}`,
    status: "queued",
    config: { interfaceName, captureSeconds, topK, writeLogs },
  });

  res.status(202).json(session);
  broadcastEvent({ type: "session.created", payload: session });
  enqueueSessionJob(session, broadcastEvent);
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "127.0.0.1";

server.listen(port, host, () => {
  console.log(`Backend listening on http://${host}:${port}`);
});
