import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export function runPythonAnalysis({
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

    const child = spawn("python3", args, {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
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
  });
}
