"use client";

import {
  AdminUsersPanel,
  AuditLogPanel,
  AuthScreen,
  DataTable,
  EstimateChart,
  ExportPanel,
  Metric,
  PathScoreChart,
  ProtocolSummary,
  SessionCard,
  TopologyMap,
} from "../components/dashboard/ui";
import { formatTimestamp } from "../lib/dashboard-utils";
import { useDashboard } from "../hooks/useDashboard";

export default function Page() {
  const dashboard = useDashboard();

  if (!dashboard.authState.loggedIn) {
    return (
      <AuthScreen
        auth={dashboard.auth}
        setAuth={dashboard.setAuth}
        authState={dashboard.authState}
        error={dashboard.error}
        loading={dashboard.loading}
        handleLogin={dashboard.handleLogin}
      />
    );
  }

  return (
    <main className="shell">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="panel p-5 fade-in-up">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.25em] text-[#c44536]">Command Center</div>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-[#14213d]">
              Traffic Correlation Observatory
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#5f6b7a]">
              Refined dashboard for controlled anonymous-routing analysis, protocol-aware PCAP parsing,
              exportable reports, audit logging, and live capture review.
            </p>
          </div>

          <div className="mb-4 rounded-2xl bg-[#14213d] px-4 py-3 text-sm text-white">
            Signed in as <span className="font-semibold">{dashboard.authState.user?.username}</span> ·{" "}
            <span className="uppercase tracking-[0.18em] text-[#d7f0ec]">
              {dashboard.authState.user?.role}
            </span>
            <div className="mt-2 text-xs text-[#d7f0ec]">
              Token expires: {formatTimestamp(dashboard.auth.expiresAt)}
            </div>
            <button
              onClick={dashboard.handleLogout}
              className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white"
            >
              Logout
            </button>
          </div>

          {!dashboard.canRunAnalysis ? (
            <div className="mb-4 rounded-2xl border border-[rgba(196,69,54,0.18)] bg-[#fff5f3] p-4 text-sm text-[#8d2f23]">
              Viewer accounts can inspect sessions and export reports, but only Analyst and Admin roles can
              create new analysis jobs.
            </div>
          ) : null}

          <div className="rounded-2xl border border-[rgba(20,33,61,0.08)] bg-white/70 p-4">
            <div className="text-sm font-semibold text-[#14213d]">Launch simulation</div>
            <div className="mt-4 grid gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-[#5f6b7a]">Sessions</span>
                <input
                  className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
                  type="number"
                  value={dashboard.simulateForm.sessions}
                  onChange={(event) =>
                    dashboard.setSimulateForm((current) => ({
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
                  value={dashboard.simulateForm.seed}
                  onChange={(event) =>
                    dashboard.setSimulateForm((current) => ({
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
                  value={dashboard.simulateForm.topK}
                  onChange={(event) =>
                    dashboard.setSimulateForm((current) => ({
                      ...current,
                      topK: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <button
                onClick={dashboard.startSimulation}
                disabled={dashboard.loading || !dashboard.canRunAnalysis}
                className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Run analysis
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[rgba(20,33,61,0.08)] bg-white/70 p-4">
            <div className="text-sm font-semibold text-[#14213d]">Upload replay or PCAP</div>
            <p className="mt-2 text-sm text-[#5f6b7a]">
              Accepts `.jsonl`, `.csv`, `.pcap`, or `.pcapng` and routes them to the correct backend workflow.
            </p>
            <input
              className="mt-4 block w-full text-sm"
              type="file"
              accept=".jsonl,.csv,.pcap,.pcapng"
              onChange={(event) => dashboard.setReplayFile(event.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => dashboard.uploadDataset("/api/sessions/replay")}
              disabled={!dashboard.replayFile || dashboard.loading || !dashboard.canRunAnalysis}
              className="mt-4 rounded-xl bg-[#c44536] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              Upload and analyze
            </button>
            <button
              onClick={() => dashboard.uploadDataset("/api/sessions/pcap")}
              disabled={!dashboard.replayFile || dashboard.loading || !dashboard.canRunAnalysis}
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
                  value={dashboard.liveForm.interfaceName}
                  onChange={(event) =>
                    dashboard.setLiveForm((current) => ({
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
                  value={dashboard.liveForm.captureSeconds}
                  onChange={(event) =>
                    dashboard.setLiveForm((current) => ({
                      ...current,
                      captureSeconds: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <button
                onClick={dashboard.startLiveCapture}
                disabled={dashboard.loading || !dashboard.canRunAnalysis}
                className="rounded-xl bg-[#2a9d8f] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Start live capture
              </button>
            </div>
          </div>

          {dashboard.error ? (
            <div className="mt-4 rounded-2xl border border-[rgba(196,69,54,0.2)] bg-[#fff5f3] px-4 py-3 text-sm text-[#8d2f23]">
              {dashboard.error}
            </div>
          ) : null}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#14213d]">Sessions</div>
              <button onClick={dashboard.refreshSessions} className="text-sm font-medium text-[#2a9d8f]">
                Refresh
              </button>
            </div>
            <div className="grid gap-3">
              {dashboard.sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  active={session.id === dashboard.selectedSessionId}
                  onClick={dashboard.setSelectedSessionId}
                />
              ))}
            </div>
          </div>
        </aside>

        <section className="grid gap-6">
          <div className="panel p-6 fade-in-up">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-[#2a9d8f]">Live Review</div>
                <h2 className="mt-2 text-3xl font-semibold">
                  {dashboard.selectedSession ? dashboard.selectedSession.inputLabel : "Select a session"}
                </h2>
                <p className="mt-2 text-sm text-[#5f6b7a]">
                  {dashboard.selectedSession
                    ? `${dashboard.selectedSession.mode} session · ${dashboard.selectedSession.status}`
                    : "Run a simulation or upload a dataset to inspect results."}
                </p>
                {dashboard.selectedSession ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-[#5f6b7a]">
                    <span className="rounded-full bg-white/70 px-3 py-2">
                      Created {formatTimestamp(dashboard.selectedSession.createdAt)}
                    </span>
                    <span className="rounded-full bg-white/70 px-3 py-2">
                      Updated {formatTimestamp(dashboard.selectedSession.finishedAt ?? dashboard.selectedSession.createdAt)}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl bg-[#f3d6d2] px-4 py-3 text-sm text-[#8d2f23]">
                Role-aware access, token expiry, and audit logging enabled
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Metric label="Raw Events" value={dashboard.selectedSession?.result?.summary?.rawEvents ?? 0} />
              <Metric label="Correlations" value={dashboard.selectedSession?.result?.summary?.correlations ?? 0} />
              <Metric label="Ranked Paths" value={dashboard.selectedSession?.result?.summary?.rankedPaths ?? 0} />
              <Metric label="Top Region" value={dashboard.selectedSession?.result?.estimates?.[0]?.region ?? "N/A"} accent />
            </div>
          </div>

          <ExportPanel disabled={!dashboard.selectedSessionId || dashboard.loading} onCsv={dashboard.exportCsv} onPdf={dashboard.exportPdf} />

          <TopologyMap
            paths={dashboard.selectedSession?.result?.paths ?? []}
            correlations={dashboard.selectedSession?.result?.correlations ?? []}
          />

          {dashboard.isAdmin ? (
            <>
              <AdminUsersPanel
                users={dashboard.users}
                draft={dashboard.userDraft}
                setDraft={dashboard.setUserDraft}
                onCreate={dashboard.createUser}
                updateDraft={dashboard.updateUserDraft}
                onApplyRole={dashboard.saveUser}
                disabled={dashboard.loading}
              />
              <AuditLogPanel logs={dashboard.auditLogs} />
            </>
          ) : null}

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
                rows={dashboard.estimateRows}
              />
              <EstimateChart rows={dashboard.estimateRows} />
            </div>

            <div className="grid gap-6">
              <div className="panel p-5">
                <h3 className="text-lg font-semibold">Evaluation Snapshot</h3>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#5f6b7a]">Suspicious Sessions</div>
                    <div className="mt-2 text-2xl font-semibold">{dashboard.evaluation?.suspicious_sessions ?? 0}</div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#5f6b7a]">Session Accuracy</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {dashboard.evaluation ? `${(dashboard.evaluation.session_accuracy * 100).toFixed(2)}%` : "0.00%"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#5f6b7a]">True Suspicious Origin</div>
                    <div className="mt-2 text-2xl font-semibold">{dashboard.evaluation?.true_origin_region ?? "N/A"}</div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#5f6b7a]">Predicted Top Origin</div>
                    <div className="mt-2 text-2xl font-semibold">{dashboard.evaluation?.predicted_origin_region ?? "N/A"}</div>
                  </div>
                </div>
              </div>
              <PathScoreChart rows={dashboard.pathRows} />
            </div>
          </div>

          <ProtocolSummary rows={dashboard.protocolRows} />

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
            rows={dashboard.pathRows}
          />

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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
              rows={dashboard.correlationRows}
            />

            <div className="panel p-5">
              <h3 className="text-lg font-semibold">Terminal Report</h3>
              <div className="mt-5 overflow-auto rounded-3xl bg-[#14213d] p-5 font-mono text-sm leading-6 text-[#f5f0e8]">
                <pre>{dashboard.selectedSession?.result?.report ?? "No report yet."}</pre>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
