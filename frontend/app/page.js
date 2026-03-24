"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

function SessionCard({ session, active, onClick }) {
  return (
    <button
      onClick={() => onClick(session.id)}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-[#14213d] bg-white shadow-sm"
          : "border-[rgba(20,33,61,0.08)] bg-[rgba(255,255,255,0.6)]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-[#5f6b7a]">
            {session.mode}
          </div>
          <div className="mt-1 text-lg font-semibold text-[#14213d]">
            {session.inputLabel}
          </div>
        </div>
        <div className="rounded-full bg-[#d7f0ec] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2a9d8f]">
          {session.status}
        </div>
      </div>
      <div className="mt-3 text-sm text-[#5f6b7a]">{session.createdAt}</div>
    </button>
  );
}

function Metric({ label, value, accent = false }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? "bg-[#14213d] text-white" : "bg-white/70 text-[#14213d]"
      } border-[rgba(20,33,61,0.08)]`}
    >
      <div className="text-xs uppercase tracking-[0.2em] opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function DataTable({ title, columns, rows }) {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-[rgba(20,33,61,0.08)] px-5 py-4">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,61,0.04)] text-[#5f6b7a]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[#5f6b7a]" colSpan={columns.length}>
                  No data yet.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="border-t border-[rgba(20,33,61,0.08)]">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 align-top">
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EstimateChart({ rows }) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.confidenceRaw), 0) || 1;

  return (
    <div className="panel p-5">
      <h3 className="text-lg font-semibold">Confidence Distribution</h3>
      <div className="mt-5 space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-[#5f6b7a]">Run a session to populate the chart.</p>
        ) : (
          rows.map((row) => (
            <div key={row.region}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-[#14213d]">{row.region}</span>
                <span className="text-[#5f6b7a]">{row.confidence}</span>
              </div>
              <div className="h-3 rounded-full bg-[rgba(20,33,61,0.08)]">
                <div
                  className="h-3 rounded-full bg-[#c44536]"
                  style={{ width: `${(row.confidenceRaw / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PathScoreChart({ rows }) {
  const points = rows.map((row, index) => ({
    x: 30 + index * 84,
    y: 156 - row.scoreRaw * 120,
    label: row.session,
  }));

  return (
    <div className="panel p-5">
      <h3 className="text-lg font-semibold">Path Score Curve</h3>
      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-[#5f6b7a]">No ranked paths yet.</p>
      ) : (
        <svg viewBox="0 0 560 180" className="mt-5 w-full">
          <line x1="20" y1="156" x2="540" y2="156" stroke="rgba(20,33,61,0.2)" />
          <line x1="30" y1="20" x2="30" y2="156" stroke="rgba(20,33,61,0.2)" />
          <polyline
            fill="none"
            stroke="#2a9d8f"
            strokeWidth="4"
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          />
          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" fill="#c44536" />
              <text x={point.x} y="174" textAnchor="middle" fontSize="10" fill="#5f6b7a">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export default function Page() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [simulateForm, setSimulateForm] = useState({ sessions: 18, seed: 7, topK: 8 });
  const [liveForm, setLiveForm] = useState({ interfaceName: "any", captureSeconds: 8, topK: 8 });
  const [replayFile, setReplayFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [auth, setAuth] = useState({ token: "", username: "", password: "" });
  const [authState, setAuthState] = useState({ loggedIn: false, user: null, bootstrap: null });

  async function refreshSessions() {
    const response = await fetch(`${API_BASE}/api/sessions`, {
      cache: "no-store",
      headers: authState.loggedIn ? { Authorization: `Bearer ${auth.token}` } : {},
    });
    if (response.status === 401) {
      setAuthState((current) => ({ ...current, loggedIn: false, user: null }));
      setSessions([]);
      setSelectedSession(null);
      return;
    }
    const data = await response.json();
    setSessions(data.sessions);
    if (!selectedSessionId && data.sessions.length > 0) {
      setSelectedSessionId(data.sessions[0].id);
    }
  }

  async function refreshSelectedSession(sessionId) {
    if (!sessionId) {
      setSelectedSession(null);
      return;
    }
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      cache: "no-store",
      headers: authState.loggedIn ? { Authorization: `Bearer ${auth.token}` } : {},
    });
    if (response.ok) {
      const data = await response.json();
      setSelectedSession(data);
    }
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/bootstrap`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setAuthState((current) => ({ ...current, bootstrap: data.defaultUser }));
        setAuth((current) => ({
          ...current,
          username: data.defaultUser?.username ?? "",
          password: data.defaultUser?.password ?? "",
        }));
      });
  }, []);

  useEffect(() => {
    if (authState.loggedIn) {
      refreshSessions();
    }
  }, [authState.loggedIn]);

  useEffect(() => {
    if (authState.loggedIn) {
      refreshSelectedSession(selectedSessionId);
    }
  }, [selectedSessionId, authState.loggedIn]);

  useEffect(() => {
    if (!authState.loggedIn) {
      return undefined;
    }

    const socket = new WebSocket(API_BASE.replace("http", "ws") + "/ws/live");
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "session.created" || message.type === "session.updated") {
        refreshSessions();
        if (selectedSessionId) {
          refreshSelectedSession(selectedSessionId);
        }
      }
    };

    return () => socket.close();
  }, [selectedSessionId, authState.loggedIn]);

  async function handleLogin() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: auth.username,
          password: auth.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Login failed");
      }
      setAuth((current) => ({ ...current, token: data.token }));
      setAuthState((current) => ({ ...current, loggedIn: true, user: data.user }));
    } finally {
      setLoading(false);
    }
  }

  async function startSimulation() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/sessions/simulate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(simulateForm),
      });
      const session = await response.json();
      setSelectedSessionId(session.id);
      await refreshSessions();
    } finally {
      setLoading(false);
    }
  }

  async function uploadReplay(endpoint) {
    if (!replayFile) return;
    setLoading(true);
    try {
      const body = new FormData();
      body.set("dataset", replayFile);
      body.set("topK", String(simulateForm.topK));
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body,
      });
      const session = await response.json();
      setSelectedSessionId(session.id);
      await refreshSessions();
    } finally {
      setLoading(false);
    }
  }

  async function startLiveCapture() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/sessions/live`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(liveForm),
      });
      const session = await response.json();
      setSelectedSessionId(session.id);
      await refreshSessions();
    } finally {
      setLoading(false);
    }
  }

  const estimateRows = useMemo(
    () =>
      (selectedSession?.result?.estimates ?? []).map((estimate) => ({
        region: estimate.region,
        confidence: `${(estimate.confidence * 100).toFixed(2)}%`,
        confidenceRaw: estimate.confidence,
        support: estimate.support.toFixed(3),
        paths: estimate.path_count,
      })),
    [selectedSession],
  );

  const pathRows = useMemo(
    () =>
      (selectedSession?.result?.paths ?? []).map((path) => ({
        session: path.session_id,
        route: `${path.entry_node_id} → ${path.middle_node_id} → ${path.exit_node_id}`,
        origin: path.entry_region,
        score: path.path_score.toFixed(3),
        scoreRaw: path.path_score,
        kind: path.path_kind,
        suspicious: path.suspicious ? "yes" : "no",
      })),
    [selectedSession],
  );

  const correlationRows = useMemo(
    () =>
      (selectedSession?.result?.correlations ?? []).slice(0, 8).map((item) => ({
        hop: `${item.left_node_type} → ${item.right_node_type}`,
        pair: `${item.left_node_id} → ${item.right_node_id}`,
        score: item.final_score.toFixed(3),
        time: item.time_delta.toFixed(3),
        size: item.size_delta,
        session: item.session_match ? "match" : "mix",
      })),
    [selectedSession],
  );

  const evaluation = selectedSession?.result?.evaluation;

  if (!authState.loggedIn) {
    return (
      <main className="shell">
        <div className="mx-auto max-w-3xl panel p-8">
          <div className="text-xs uppercase tracking-[0.25em] text-[#c44536]">Secure Access</div>
          <h1 className="mt-3 text-4xl font-semibold text-[#14213d]">
            Traffic Correlation Control Portal
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f6b7a]">
            Sign in to access simulations, replay analysis, PCAP ingestion, and live
            capture workflows. The backend seeds a default admin account for local demo use.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-3xl bg-white/70 p-6">
              <div className="text-sm font-semibold text-[#14213d]">Login</div>
              <div className="mt-4 grid gap-3">
                <input
                  className="rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-3"
                  placeholder="Username"
                  value={auth.username}
                  onChange={(event) =>
                    setAuth((current) => ({ ...current, username: event.target.value }))
                  }
                />
                <input
                  className="rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-3"
                  placeholder="Password"
                  type="password"
                  value={auth.password}
                  onChange={(event) =>
                    setAuth((current) => ({ ...current, password: event.target.value }))
                  }
                />
                <button
                  onClick={handleLogin}
                  disabled={loading || !auth.username || !auth.password}
                  className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Sign in
                </button>
              </div>
            </div>
            <div className="rounded-3xl bg-[#14213d] p-6 text-[#f5f0e8]">
              <div className="text-sm uppercase tracking-[0.2em] text-[#d7f0ec]">
                Default Demo Account
              </div>
              <div className="mt-4 text-lg">
                Username: {authState.bootstrap?.username ?? "loading..."}
              </div>
              <div className="mt-2 text-lg">
                Password: {authState.bootstrap?.password ?? "loading..."}
              </div>
              <p className="mt-4 text-sm leading-6 text-[#e9e0d5]">
                Change `APP_DEFAULT_USER` and `APP_DEFAULT_PASS` in the backend environment
                for a non-demo deployment.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="panel p-5">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.25em] text-[#c44536]">Command Center</div>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-[#14213d]">
              Traffic Correlation Observatory
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#5f6b7a]">
              Persistent dashboard for controlled anonymous-routing analysis, replay
              inspection, PCAP parsing, and live capture review.
            </p>
          </div>

          <div className="rounded-2xl border border-[rgba(20,33,61,0.08)] bg-white/70 p-4">
            <div className="text-sm font-semibold text-[#14213d]">Launch simulation</div>
            <div className="mt-4 grid gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-[#5f6b7a]">Sessions</span>
                <input
                  className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
                  type="number"
                  value={simulateForm.sessions}
                  onChange={(event) =>
                    setSimulateForm((current) => ({
                      ...current,
                      sessions: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[#5f6b7a]">Seed</span>
                <input
                  className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
                  type="number"
                  value={simulateForm.seed}
                  onChange={(event) =>
                    setSimulateForm((current) => ({
                      ...current,
                      seed: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[#5f6b7a]">Top paths</span>
                <input
                  className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
                  type="number"
                  value={simulateForm.topK}
                  onChange={(event) =>
                    setSimulateForm((current) => ({
                      ...current,
                      topK: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <button
                onClick={startSimulation}
                disabled={loading}
                className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Run analysis
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[rgba(20,33,61,0.08)] bg-white/70 p-4">
            <div className="text-sm font-semibold text-[#14213d]">Upload replay or PCAP</div>
            <p className="mt-2 text-sm text-[#5f6b7a]">
              Accepts structured `.jsonl`, `.csv`, or `.pcap` inputs using backend upload endpoints.
            </p>
            <input
              className="mt-4 block w-full text-sm"
              type="file"
              accept=".jsonl,.csv,.pcap,.pcapng"
              onChange={(event) => setReplayFile(event.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => uploadReplay("/api/sessions/replay")}
              disabled={!replayFile || loading}
              className="mt-4 rounded-xl bg-[#c44536] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              Upload and analyze
            </button>
            <button
              onClick={() => uploadReplay("/api/sessions/pcap")}
              disabled={!replayFile || loading}
              className="mt-3 rounded-xl bg-[#8d6e63] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              Analyze as PCAP
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-[rgba(20,33,61,0.08)] bg-white/70 p-4">
            <div className="text-sm font-semibold text-[#14213d]">Live capture</div>
            <div className="mt-4 grid gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-[#5f6b7a]">Interface</span>
                <input
                  className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
                  value={liveForm.interfaceName}
                  onChange={(event) =>
                    setLiveForm((current) => ({
                      ...current,
                      interfaceName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[#5f6b7a]">Capture seconds</span>
                <input
                  className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
                  type="number"
                  value={liveForm.captureSeconds}
                  onChange={(event) =>
                    setLiveForm((current) => ({
                      ...current,
                      captureSeconds: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <button
                onClick={startLiveCapture}
                disabled={loading}
                className="rounded-xl bg-[#2a9d8f] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Start live capture
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#14213d]">Sessions</div>
              <button onClick={refreshSessions} className="text-sm font-medium text-[#2a9d8f]">
                Refresh
              </button>
            </div>
            <div className="grid gap-3">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  active={session.id === selectedSessionId}
                  onClick={setSelectedSessionId}
                />
              ))}
            </div>
          </div>
        </aside>

        <section className="grid gap-6">
          <div className="panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-[#2a9d8f]">Live Review</div>
                <h2 className="mt-2 text-3xl font-semibold">
                  {selectedSession ? selectedSession.inputLabel : "Select a session"}
                </h2>
                <p className="mt-2 text-sm text-[#5f6b7a]">
                  {selectedSession
                    ? `${selectedSession.mode} session · ${selectedSession.status}`
                    : "Run a simulation or upload a dataset to inspect results."}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f3d6d2] px-4 py-3 text-sm text-[#8d2f23]">
                Signed in as {authState.user?.username}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Metric label="Raw Events" value={selectedSession?.result?.summary?.rawEvents ?? 0} />
              <Metric
                label="Correlations"
                value={selectedSession?.result?.summary?.correlations ?? 0}
              />
              <Metric
                label="Ranked Paths"
                value={selectedSession?.result?.summary?.rankedPaths ?? 0}
              />
              <Metric
                label="Top Region"
                value={selectedSession?.result?.estimates?.[0]?.region ?? "N/A"}
                accent
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-6">
              <DataTable
                title="Estimated Regions"
                columns={[
                  { key: "region", label: "Region" },
                  { key: "confidence", label: "Confidence" },
                  { key: "support", label: "Support" },
                  { key: "paths", label: "Paths" },
                ]}
                rows={estimateRows}
              />
              <EstimateChart rows={estimateRows} />
            </div>

            <div className="grid gap-6">
              <div className="panel p-5">
                <h3 className="text-lg font-semibold">Evaluation Snapshot</h3>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#5f6b7a]">
                      Suspicious Sessions
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {evaluation?.suspicious_sessions ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#5f6b7a]">
                      Session Accuracy
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {evaluation
                        ? `${(evaluation.session_accuracy * 100).toFixed(2)}%`
                        : "0.00%"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#5f6b7a]">
                      True Suspicious Origin
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {evaluation?.true_origin_region ?? "N/A"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#5f6b7a]">
                      Predicted Top Origin
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {evaluation?.predicted_origin_region ?? "N/A"}
                    </div>
                  </div>
                </div>
              </div>
              <PathScoreChart rows={pathRows} />
            </div>
          </div>

          <DataTable
            title="Ranked Correlated Paths"
            columns={[
              { key: "session", label: "Session" },
              { key: "route", label: "Route" },
              { key: "origin", label: "Origin" },
              { key: "score", label: "Score" },
              { key: "kind", label: "Kind" },
              { key: "suspicious", label: "Suspicious" },
            ]}
            rows={pathRows}
          />

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <DataTable
              title="Hop Correlations"
              columns={[
                { key: "hop", label: "Hop" },
                { key: "pair", label: "Node Pair" },
                { key: "score", label: "Score" },
                { key: "time", label: "Time Δ" },
                { key: "size", label: "Size Δ" },
                { key: "session", label: "Session" },
              ]}
              rows={correlationRows}
            />
            <div className="panel p-5">
              <h3 className="text-lg font-semibold">Terminal Report</h3>
              <pre className="mt-4 overflow-auto rounded-2xl bg-[#14213d] p-4 text-xs leading-6 text-[#f5f0e8]">
                {selectedSession?.result?.report ?? "No report yet."}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
