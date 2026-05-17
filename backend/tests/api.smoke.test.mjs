import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const port = 4310;
const baseUrl = `http://127.0.0.1:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {}
    await wait(500);
  }
  throw new Error("Server did not start in time");
}

let serverProcess;

test.before(async () => {
  serverProcess = spawn("node", ["server.js"], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "development",
    },
    stdio: "ignore",
  });
  await waitForServer();
});

test.after(() => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
});

test("health and docs endpoints respond", async () => {
  const [healthResponse, docsResponse] = await Promise.all([
    fetch(`${baseUrl}/api/health`),
    fetch(`${baseUrl}/api/docs/openapi.yaml`),
  ]);

  assert.equal(healthResponse.status, 200);
  assert.equal(docsResponse.status, 200);
  assert.match(await docsResponse.text(), /openapi: 3\.1\.0/);
});

test("login, csrf-protected routes, and metrics work", async () => {
  const bootstrap = await fetch(`${baseUrl}/api/bootstrap`).then((response) => response.json());
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: bootstrap.defaultUser.username,
      password: bootstrap.defaultUser.password,
    }),
  });
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.json();
  assert.ok(login.token);
  assert.ok(login.csrfToken);

  const authHeaders = {
    Authorization: `Bearer ${login.token}`,
    "X-CSRF-Token": login.csrfToken,
  };

  const meResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: authHeaders });
  assert.equal(meResponse.status, 200);

  const metricsResponse = await fetch(`${baseUrl}/api/metrics`, { headers: authHeaders });
  assert.equal(metricsResponse.status, 200);
  const metrics = await metricsResponse.json();
  assert.ok(metrics.requests.total >= 1);
  assert.ok(metrics.database.users >= 1);

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: authHeaders,
  });
  assert.equal(logoutResponse.status, 200);
});
