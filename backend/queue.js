import crypto from "node:crypto";

import { createJob, listQueuedJobs, updateJob, updateSession } from "./db.js";
import { runPythonAnalysis } from "./pythonRunner.js";

let queuePromise = null;

export function enqueueSessionJob(session, broadcast) {
  createJob({
    id: `job_${crypto.randomUUID()}`,
    sessionId: session.id,
    status: "queued",
  });

  if (!queuePromise) {
    queuePromise = processQueue(broadcast).finally(() => {
      queuePromise = null;
    });
  }
}

async function processQueue(broadcast) {
  const jobs = listQueuedJobs();

  for (const job of jobs) {
    updateJob(job.id, {
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const runningSession = updateSession(job.sessionId, { status: "running" });
    broadcast({ type: "session.updated", payload: runningSession });

    try {
      const result = await runPythonAnalysis({
        mode: job.mode,
        dataset: job.config.datasetPath,
        sessions: job.config.sessions,
        seed: job.config.seed,
        topK: job.config.topK,
        writeLogs: job.config.writeLogs,
        captureSeconds: job.config.captureSeconds,
        interfaceName: job.config.interfaceName,
      });

      updateJob(job.id, {
        status: "completed",
        finishedAt: new Date().toISOString(),
      });
      const completedSession = updateSession(job.sessionId, {
        status: "completed",
        finishedAt: new Date().toISOString(),
        result,
      });
      broadcast({ type: "session.updated", payload: completedSession });
    } catch (error) {
      updateJob(job.id, {
        status: "failed",
        finishedAt: new Date().toISOString(),
      });
      const failedSession = updateSession(job.sessionId, {
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      broadcast({ type: "session.updated", payload: failedSession });
    }
  }
}
