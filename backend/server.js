import cors from "cors";
import express from "express";
import multer from "multer";
import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { login, logout, requireAuth, requireRole } from "./auth.js";
import {
  cleanupExpiredTokens,
  createUserAccount,
  createSession,
  getDefaultCredentials,
  getSessionById,
  listDemoAccounts,
  listAuditLogs,
  listSessions,
  listUsers,
  recordAuditEvent,
  updateUserAccount,
} from "./db.js";
import { enqueueSessionJob } from "./queue.js";
import { broadcastEvent, registerSocketUpgrade } from "./socketHub.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");

await fs.mkdir(uploadsDir, { recursive: true });
cleanupExpiredTokens();

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function collectPdfBuffer(session) {
  const result = session.result ?? {};
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const drawSectionTitle = (title) => {
      doc.moveDown();
      doc.fontSize(14).fillColor("#14213d").text(title);
      doc.moveDown(0.35);
    };

    doc.fontSize(20).fillColor("#14213d").text("Traffic Correlation Session Report");
    doc.moveDown(0.4);
    doc
      .fontSize(10)
      .fillColor("#5f6b7a")
      .text(`${session.inputLabel} | ${session.mode} | ${session.status}`);
    doc.moveDown();

    doc
      .fontSize(12)
      .fillColor("#14213d")
      .text(`Raw events: ${result.summary?.rawEvents ?? 0}`)
      .text(`Correlations: ${result.summary?.correlations ?? 0}`)
      .text(`Ranked paths: ${result.summary?.rankedPaths ?? 0}`)
      .text(`Top region: ${result.estimates?.[0]?.region ?? "N/A"}`);

    drawSectionTitle("Estimated Regions");
    for (const estimate of result.estimates ?? []) {
      doc
        .fontSize(10)
        .fillColor("#1f2937")
        .text(
          `${estimate.region}: ${(estimate.confidence * 100).toFixed(2)}% confidence, support ${estimate.support.toFixed(3)}, paths ${estimate.path_count}`,
        );
    }
    if (!(result.estimates ?? []).length) {
      doc.fontSize(10).fillColor("#5f6b7a").text("No estimated regions available.");
    }

    drawSectionTitle("Protocol Summary");
    for (const protocol of (result.protocolSummary ?? []).slice(0, 8)) {
      doc
        .fontSize(10)
        .fillColor("#1f2937")
        .text(`${protocol.protocol}: ${protocol.count} events (${protocol.share.toFixed(2)}%)`);
    }
    if (!(result.protocolSummary ?? []).length) {
      doc.fontSize(10).fillColor("#5f6b7a").text("No protocol summary available.");
    }

    drawSectionTitle("Evaluation");
    doc
      .fontSize(10)
      .fillColor("#1f2937")
      .text(`Suspicious sessions: ${result.evaluation?.suspicious_sessions ?? 0}`)
      .text(`Session accuracy: ${((result.evaluation?.session_accuracy ?? 0) * 100).toFixed(2)}%`)
      .text(`True suspicious origin: ${result.evaluation?.true_origin_region ?? "N/A"}`)
      .text(`Predicted top origin: ${result.evaluation?.predicted_origin_region ?? "N/A"}`);

    drawSectionTitle("Ranked Paths");
    for (const pathItem of (result.paths ?? []).slice(0, 14)) {
      doc
        .fontSize(10)
        .fillColor("#1f2937")
        .text(
          `${pathItem.session_id}: ${pathItem.entry_node_id} -> ${pathItem.middle_node_id} -> ${pathItem.exit_node_id} | ${pathItem.entry_region} | score ${pathItem.path_score.toFixed(3)} | ${pathItem.path_kind} | suspicious=${pathItem.suspicious ? "yes" : "no"}`,
        );
    }
    if (!(result.paths ?? []).length) {
      doc.fontSize(10).fillColor("#5f6b7a").text("No ranked paths available.");
    }

    if (doc.y > 660) {
      doc.addPage();
    }
    drawSectionTitle("Terminal Report");
    doc.fontSize(9).fillColor("#111827").text(String(result.report ?? "No report available."), {
      width: 520,
    });

    doc.end();
  });
}

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
    demoAccounts: listDemoAccounts(),
    capabilities: ["simulate", "replay", "pcap", "live"],
    auth: { tokenTtlHours: Number(process.env.AUTH_TOKEN_TTL_HOURS ?? 8) },
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

app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/logout", (req, res) => {
  logout(req.authToken, req.user);
  res.json({ ok: true });
});

app.get("/api/users", requireRole(["admin"]), (_req, res) => {
  res.json({ users: listUsers() });
});

app.get("/api/audit-logs", requireRole(["admin"]), (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 150), 300);
  res.json({ logs: listAuditLogs(limit) });
});

app.post("/api/users", requireRole(["admin"]), (req, res) => {
  try {
    const user = createUserAccount(req.body || {});
    recordAuditEvent({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: "user.create",
      targetType: "user",
      targetId: user.id,
      metadata: { username: user.username, role: user.role },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.patch("/api/users/:userId", requireRole(["admin"]), (req, res) => {
  try {
    const user = updateUserAccount(req.params.userId, req.body || {});
    recordAuditEvent({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: "user.update",
      targetType: "user",
      targetId: user.id,
      metadata: { role: user.role, passwordUpdated: Boolean(req.body?.password) },
    });
    res.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === "User not found" ? 404 : 400).json({ error: message });
  }
});

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

app.get("/api/sessions/:sessionId/export.csv", (req, res) => {
  const session = getSessionById(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const result = session.result ?? {};
  const lines = [
    "section,key,value",
    `summary,rawEvents,${result.summary?.rawEvents ?? 0}`,
    `summary,featureEvents,${result.summary?.featureEvents ?? 0}`,
    `summary,correlations,${result.summary?.correlations ?? 0}`,
    `summary,rankedPaths,${result.summary?.rankedPaths ?? 0}`,
    `evaluation,suspiciousSessions,${result.evaluation?.suspicious_sessions ?? 0}`,
    `evaluation,sessionAccuracy,${result.evaluation?.session_accuracy ?? 0}`,
    `evaluation,trueOrigin,${result.evaluation?.true_origin_region ?? "N/A"}`,
    `evaluation,predictedOrigin,${result.evaluation?.predicted_origin_region ?? "N/A"}`,
  ];

  for (const estimate of result.estimates ?? []) {
    lines.push(
      `estimate,${estimate.region},confidence=${estimate.confidence};support=${estimate.support};paths=${estimate.path_count}`,
    );
  }

  for (const pathItem of result.paths ?? []) {
    lines.push(
      [
        "path",
        pathItem.session_id,
        `"${pathItem.entry_node_id} -> ${pathItem.middle_node_id} -> ${pathItem.exit_node_id};score=${pathItem.path_score};origin=${pathItem.entry_region};kind=${pathItem.path_kind};suspicious=${pathItem.suspicious}"`,
      ].join(","),
    );
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${session.inputLabel.replace(/[^a-zA-Z0-9_.-]/g, "_")}-report.csv"`,
  );
  recordAuditEvent({
    actorId: req.user.id,
    actorUsername: req.user.username,
    action: "session.export.csv",
    targetType: "session",
    targetId: session.id,
    metadata: { mode: session.mode },
  });
  res.send(lines.join("\n"));
});

app.get("/api/sessions/:sessionId/export.html", (req, res) => {
  const session = getSessionById(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const result = session.result ?? {};
  const estimateRows = (result.estimates ?? [])
    .map(
      (estimate) => `
        <tr>
          <td>${estimate.region}</td>
          <td>${(estimate.confidence * 100).toFixed(2)}%</td>
          <td>${estimate.support.toFixed(3)}</td>
          <td>${estimate.path_count}</td>
        </tr>`,
    )
    .join("");

  const pathRows = (result.paths ?? [])
    .map(
      (pathItem) => `
        <tr>
          <td>${pathItem.session_id}</td>
          <td>${pathItem.entry_node_id} &rarr; ${pathItem.middle_node_id} &rarr; ${pathItem.exit_node_id}</td>
          <td>${pathItem.entry_region}</td>
          <td>${pathItem.path_score.toFixed(3)}</td>
          <td>${pathItem.path_kind}</td>
          <td>${pathItem.suspicious ? "yes" : "no"}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Traffic Correlation Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #14213d; }
        h1, h2 { margin-bottom: 8px; }
        .meta { color: #5f6b7a; margin-bottom: 24px; }
        .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
        .card { border: 1px solid #d9dde3; border-radius: 12px; padding: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #d9dde3; padding: 8px; text-align: left; font-size: 14px; }
        th { background: #f5f0e8; }
        .report { white-space: pre-wrap; background: #14213d; color: #f5f0e8; padding: 16px; border-radius: 16px; margin-top: 20px; font-family: monospace; font-size: 13px; }
      </style>
    </head>
    <body>
      <h1>Traffic Correlation Session Report</h1>
      <div class="meta">${escapeHtml(session.inputLabel)} · ${escapeHtml(session.mode)} · ${escapeHtml(session.status)}</div>
      <div class="cards">
        <div class="card"><strong>Raw Events</strong><br />${result.summary?.rawEvents ?? 0}</div>
        <div class="card"><strong>Correlations</strong><br />${result.summary?.correlations ?? 0}</div>
        <div class="card"><strong>Ranked Paths</strong><br />${result.summary?.rankedPaths ?? 0}</div>
        <div class="card"><strong>Top Region</strong><br />${result.estimates?.[0]?.region ?? "N/A"}</div>
      </div>
      <h2>Estimated Regions</h2>
      <table>
        <thead><tr><th>Region</th><th>Confidence</th><th>Support</th><th>Paths</th></tr></thead>
        <tbody>${estimateRows || '<tr><td colspan="4">No estimates available.</td></tr>'}</tbody>
      </table>
      <h2>Ranked Paths</h2>
      <table>
        <thead><tr><th>Session</th><th>Route</th><th>Origin</th><th>Score</th><th>Kind</th><th>Suspicious</th></tr></thead>
        <tbody>${pathRows || '<tr><td colspan="6">No ranked paths available.</td></tr>'}</tbody>
      </table>
      <h2>Terminal Report</h2>
      <div class="report">${escapeHtml(result.report ?? "No report available.")}</div>
    </body>
  </html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  recordAuditEvent({
    actorId: req.user.id,
    actorUsername: req.user.username,
    action: "session.export.html",
    targetType: "session",
    targetId: session.id,
    metadata: { mode: session.mode },
  });
  res.send(html);
});

app.get("/api/sessions/:sessionId/export.pdf", async (req, res) => {
  const session = getSessionById(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  try {
    const pdfBuffer = await collectPdfBuffer(session);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${session.inputLabel.replace(/[^a-zA-Z0-9_.-]/g, "_")}-report.pdf"`,
    );
    recordAuditEvent({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: "session.export.pdf",
      targetType: "session",
      targetId: session.id,
      metadata: { mode: session.mode },
    });
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate PDF report",
    });
  }
});

app.post("/api/sessions/simulate", requireRole(["admin", "analyst"]), (req, res) => {
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
  recordAuditEvent({
    actorId: req.user.id,
    actorUsername: req.user.username,
    action: "session.create.simulate",
    targetType: "session",
    targetId: session.id,
    metadata: { sessions, seed, topK },
  });

  res.status(202).json(session);
  broadcastEvent({ type: "session.created", payload: session });
  enqueueSessionJob(session, broadcastEvent);
});

app.post(
  "/api/sessions/replay",
  requireRole(["admin", "analyst"]),
  upload.single("dataset"),
  (req, res) => {
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
  recordAuditEvent({
    actorId: req.user.id,
    actorUsername: req.user.username,
    action: "session.create.replay",
    targetType: "session",
    targetId: session.id,
    metadata: { inputLabel: req.file.originalname, topK },
  });

  res.status(202).json(session);
  broadcastEvent({ type: "session.created", payload: session });
  enqueueSessionJob(session, broadcastEvent);
});

app.post(
  "/api/sessions/pcap",
  requireRole(["admin", "analyst"]),
  upload.single("dataset"),
  (req, res) => {
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
  recordAuditEvent({
    actorId: req.user.id,
    actorUsername: req.user.username,
    action: "session.create.pcap",
    targetType: "session",
    targetId: session.id,
    metadata: { inputLabel: req.file.originalname, topK },
  });

  res.status(202).json(session);
  broadcastEvent({ type: "session.created", payload: session });
  enqueueSessionJob(session, broadcastEvent);
});

app.post("/api/sessions/live", requireRole(["admin", "analyst"]), (req, res) => {
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
  recordAuditEvent({
    actorId: req.user.id,
    actorUsername: req.user.username,
    action: "session.create.live",
    targetType: "session",
    targetId: session.id,
    metadata: { interfaceName, captureSeconds, topK },
  });

  res.status(202).json(session);
  broadcastEvent({ type: "session.created", payload: session });
  enqueueSessionJob(session, broadcastEvent);
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

server.listen(port, host, () => {
  console.log(`Backend listening on http://${host}:${port}`);
});
