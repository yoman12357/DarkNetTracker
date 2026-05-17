import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "./config.js";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const MAX_CAPTURED_OUTPUT = 1024 * 1024;

function truncateOutput(value) {
  if (value.length <= MAX_CAPTURED_OUTPUT) {
    return value;
  }
  return value.slice(value.length - MAX_CAPTURED_OUTPUT);
}

function runSingleAttempt({
  mode,
  dataset,
  sessions,
  seed,
  topK = 8,
  writeLogs = false,
  captureSeconds,
  interfaceName,
}) {
  return new Promise((resolve, reject) => {
    const args = [
      "engine_api.py",
      "--mode",
      mode,
      "--top-k",
      String(topK),
    ];

    if (dataset) {
      args.push("--dataset", dataset);
    }
    if (typeof sessions === "number") {
      args.push("--sessions", String(sessions));
    }
    if (typeof seed === "number") {
      args.push("--seed", String(seed));
    }
    if (writeLogs) {
      args.push("--write-logs");
    }
    if (typeof captureSeconds === "number") {
      args.push("--capture-seconds", String(captureSeconds));
    }
    if (interfaceName) {
      args.push("--interface", interfaceName);
    }

    const child = spawn(config.pythonCommand, args, {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, config.pythonTimeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout = truncateOutput(stdout + chunk.toString());
    });

    child.stderr.on("data", (chunk) => {
      stderr = truncateOutput(stderr + chunk.toString());
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`Python analysis timed out after ${config.pythonTimeoutMs}ms`));
        return;
      }

      if (code !== 0) {
        reject(new Error(stderr || `Python process exited with ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(
          new Error(
            `Failed to parse engine output: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export async function runPythonAnalysis(input) {
  let lastError = null;

  for (let attempt = 1; attempt <= config.pythonMaxRetries; attempt += 1) {
    try {
      logger.info("Starting Python analysis", { attempt, mode: input.mode });
      const result = await runSingleAttempt(input);
      logger.info("Python analysis completed", { attempt, mode: input.mode });
      return result;
    } catch (error) {
      lastError = error;
      logger.warn("Python analysis failed", {
        attempt,
        mode: input.mode,
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt >= config.pythonMaxRetries) {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
