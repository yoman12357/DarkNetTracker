import crypto from "node:crypto";

import {
  claimNextQueuedJob,
  createJob,
  hasQueuedJobs,
  recoverStaleRunningJobs,
  updateJob,
  updateSession,
} from "./db.js";
import { runPythonAnalysis } from "./pythonRunner.js";

let queuePromise = null;
const LEASE_MS = 5 * 60 * 1000;

export function enqueueSessionJob(session, broadcast) {
  createJob({
    id: `job_${crypto.randomUUID()}`,
    sessionId: session.id,
    status: "queued",
  });

  if (!queuePromise) {
    queuePromise = processQueue(broadcast).finally(() => {
      queuePromise = null;
      if (hasQueuedJobs()) {
        queuePromise = processQueue(broadcast).finally(() => {
          queuePromise = null;
        });
      }
    });
  }
}

async function processQueue(broadcast) {
  recoverStaleRunningJobs();

  while (true) {
    const startedAt = new Date().toISOString();
    const leaseExpiresAt = new Date(Date.now() + LEASE_MS).toISOString();
    const job = claimNextQueuedJob({ startedAt, leaseExpiresAt });

    if (!job) {
      return;
    }

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
        leaseExpiresAt: null,
        lastError: null,
      });
      const completedSession = updateSession(job.sessionId, {
        status: "completed",
        finishedAt: new Date().toISOString(),
        result,
      });
      broadcast({ type: "session.updated", payload: completedSession });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry = (job.attempt_count ?? 0) < (job.max_attempts ?? 2);

      if (shouldRetry) {
        updateJob(job.id, {
          status: "queued",
          finishedAt: null,
          leaseExpiresAt: null,
          lastError: message,
        });
        const retriedSession = updateSession(job.sessionId, {
          status: "queued",
          error: `Retry scheduled after transient failure: ${message}`,
        });
        broadcast({ type: "session.updated", payload: retriedSession });
        continue;
      }

      updateJob(job.id, {
        status: "failed",
        finishedAt: new Date().toISOString(),
        leaseExpiresAt: null,
        lastError: message,
      });
      const failedSession = updateSession(job.sessionId, {
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: message,
      });
      broadcast({ type: "session.updated", payload: failedSession });
    }
  }
}
