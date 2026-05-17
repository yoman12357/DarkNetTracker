"use client";

import React from "react";
import ReactFlow, { Background, Controls, MarkerType, MiniMap } from "reactflow";
import "reactflow/dist/style.css";

import { STAGE_X, formatTimestamp } from "../../lib/dashboard-utils";

export function SessionCard({ session, active, onClick }) {
  return (
    <button
      onClick={() => onClick(session.id)}
      className={`group w-full rounded-2xl border px-4 py-3 text-left transition duration-300 ${
        active
          ? "border-[#14213d] bg-white shadow-lg shadow-[rgba(20,33,61,0.08)]"
          : "border-[rgba(20,33,61,0.08)] bg-[rgba(255,255,255,0.72)] hover:-translate-y-0.5 hover:bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-[#5f6b7a]">{session.mode}</div>
          <div className="mt-1 text-lg font-semibold text-[#14213d]">{session.inputLabel}</div>
        </div>
        <div className="rounded-full bg-[#d7f0ec] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2a9d8f]">
          {session.status}
        </div>
      </div>
      <div className="mt-3 text-sm text-[#5f6b7a]">{session.createdAt}</div>
    </button>
  );
}

export function Metric({ label, value, accent = false }) {
  return (
    <div
      className={`metric-card rounded-2xl border p-4 transition duration-500 ${
        accent ? "bg-[#14213d] text-white" : "bg-white/80 text-[#14213d]"
      } border-[rgba(20,33,61,0.08)]`}
    >
      <div className="text-xs uppercase tracking-[0.2em] opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

export function DataTable({ title, columns, rows, emptyLabel = "No data yet." }) {
  const tableId = `${title.replace(/\s+/g, "-").toLowerCase()}-title`;
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-[rgba(20,33,61,0.08)] px-5 py-4">
        <h3 className="text-lg font-semibold" id={tableId}>
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm" aria-labelledby={tableId}>
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
                  {emptyLabel}
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

export function EstimateChart({ rows }) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.confidenceRaw), 0) || 1;

  return (
    <div className="panel p-5">
      <h3 className="text-lg font-semibold">Confidence Distribution</h3>
      <div className="mt-5 space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-[#5f6b7a]">Run a session to populate the chart.</p>
        ) : (
          rows.map((row, index) => (
            <div key={row.region} className="fade-in-up" style={{ animationDelay: `${index * 90}ms` }}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-[#14213d]">{row.region}</span>
                <span className="text-[#5f6b7a]">{row.confidence}</span>
              </div>
              <div className="h-3 rounded-full bg-[rgba(20,33,61,0.08)]">
                <div
                  className="h-3 rounded-full bg-[#c44536] transition-all duration-700"
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

export function PathScoreChart({ rows }) {
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
            className="draw-line"
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

export function TopologyMap({ paths, correlations }) {
  const stageNodes = {
    ENTRY: new Map(),
    MIDDLE: new Map(),
    EXIT: new Map(),
  };
  const links = [];

  for (const path of paths) {
    if (!stageNodes.ENTRY.has(path.entry_node_id)) {
      stageNodes.ENTRY.set(path.entry_node_id, {
        id: path.entry_node_id,
        stage: "ENTRY",
        region: path.entry_region,
        score: path.path_score,
      });
    }
    if (!stageNodes.MIDDLE.has(path.middle_node_id)) {
      stageNodes.MIDDLE.set(path.middle_node_id, {
        id: path.middle_node_id,
        stage: "MIDDLE",
        region: path.middle_region,
        score: path.path_score,
      });
    }
    if (path.exit_node_id !== "PENDING" && !stageNodes.EXIT.has(path.exit_node_id)) {
      stageNodes.EXIT.set(path.exit_node_id, {
        id: path.exit_node_id,
        stage: "EXIT",
        region: path.exit_region,
        score: path.path_score,
      });
    }

    links.push({
      source: path.entry_node_id,
      target: path.middle_node_id,
      score: path.path_score,
      kind: path.path_kind,
    });
    if (path.exit_node_id !== "PENDING") {
      links.push({
        source: path.middle_node_id,
        target: path.exit_node_id,
        score: path.path_score,
        kind: path.path_kind,
      });
    }
  }

  for (const candidate of correlations.slice(0, 12)) {
    const leftCollection = stageNodes[candidate.left_node_type];
    const rightCollection = stageNodes[candidate.right_node_type];
    if (leftCollection && !leftCollection.has(candidate.left_node_id)) {
      leftCollection.set(candidate.left_node_id, {
        id: candidate.left_node_id,
        stage: candidate.left_node_type,
        region: candidate.left_region,
        score: candidate.final_score,
      });
    }
    if (rightCollection && !rightCollection.has(candidate.right_node_id)) {
      rightCollection.set(candidate.right_node_id, {
        id: candidate.right_node_id,
        stage: candidate.right_node_type,
        region: candidate.right_region,
        score: candidate.final_score,
      });
    }
  }

  const nodes = [];
  for (const stage of ["ENTRY", "MIDDLE", "EXIT"]) {
    [...stageNodes[stage].values()].forEach((node, index) => {
      const accent = stage === "ENTRY" ? "#2a9d8f" : stage === "MIDDLE" ? "#14213d" : "#c44536";
      nodes.push({
        id: node.id,
        position: { x: STAGE_X[stage], y: 48 + index * 110 },
        data: {
          label: (
            <div className="graph-node">
              <div className="graph-node__title">{node.id}</div>
              <div className="graph-node__meta">{node.region}</div>
              <div className="graph-node__stage">{node.stage}</div>
            </div>
          ),
        },
        draggable: false,
        connectable: false,
        selectable: false,
        style: {
          border: `2px solid ${accent}`,
          borderRadius: 22,
          background: "rgba(255,255,255,0.94)",
          color: "#14213d",
          boxShadow: "0 18px 35px rgba(20, 33, 61, 0.10)",
          padding: 6,
          minWidth: 136,
        },
      });
    });
  }

  const nodeIndex = new Set(nodes.map((node) => node.id));
  const edges = links
    .filter((link, index, array) => {
      const duplicate = array.findIndex(
        (candidate) => candidate.source === link.source && candidate.target === link.target,
      );
      return nodeIndex.has(link.source) && nodeIndex.has(link.target) && duplicate === index;
    })
    .map((link, index) => ({
      id: `${link.source}-${link.target}-${index}`,
      source: link.source,
      target: link.target,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#c44536" },
      style: {
        stroke: link.kind === "complete" ? "#2a9d8f" : "#c44536",
        strokeWidth: Math.max(2, link.score * 4.5),
        opacity: 0.92,
      },
      label: `${link.kind} · ${link.score.toFixed(2)}`,
      labelStyle: {
        fill: "#5f6b7a",
        fontSize: 11,
        fontWeight: 600,
      },
    }));

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Interactive Topology Map</h3>
          <p className="mt-1 text-sm text-[#5f6b7a]">
            Graph-library view of inferred entry, middle, and exit relationships.
          </p>
        </div>
        <div className="rounded-full bg-[#d7f0ec] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#2a9d8f]">
          {nodes.length} nodes
        </div>
      </div>

      {nodes.length === 0 ? (
        <p className="mt-6 text-sm text-[#5f6b7a]">Run a session to generate topology data.</p>
      ) : (
        <div className="mt-5 h-[460px] overflow-hidden rounded-[28px] border border-[rgba(20,33,61,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(42,157,143,0.1),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,240,232,0.86))]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap pannable zoomable nodeStrokeWidth={3} />
            <Controls showInteractive={false} />
            <Background gap={24} color="rgba(20,33,61,0.08)" />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}

export function ProtocolSummary({ rows }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Protocol Fingerprints</h3>
        <div className="rounded-full bg-[#f3d6d2] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#8d2f23]">
          Deep Packet Metadata
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-[#5f6b7a]">No protocol metadata available yet.</p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {rows.map((row, index) => (
            <div
              key={row.protocol}
              className="rounded-2xl border border-[rgba(20,33,61,0.08)] bg-white/80 p-4 fade-in-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#14213d]">{row.protocol}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#5f6b7a]">
                  {row.count} events
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[rgba(20,33,61,0.08)]">
                <div
                  className="h-2 rounded-full bg-[#2a9d8f] transition-all duration-700"
                  style={{ width: `${row.share}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-[#5f6b7a]">{row.share.toFixed(1)}% of captured events</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExportPanel({ disabled, onCsv, onPdf }) {
  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Exportable Reports</h3>
          <p className="mt-1 text-sm text-[#5f6b7a]">
            Download a CSV summary or a server-generated PDF report for this session.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCsv}
            disabled={disabled}
            className="rounded-xl bg-[#2a9d8f] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Download CSV
          </button>
          <button
            onClick={onPdf}
            disabled={disabled}
            className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersPanel({
  users,
  draft,
  setDraft,
  onCreate,
  updateDraft,
  onApplyRole,
  disabled,
}) {
  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Admin User Management</h3>
          <p className="mt-1 text-sm text-[#5f6b7a]">
            Create users, change roles, and rotate passwords without touching the database directly.
          </p>
        </div>
        <div className="rounded-full bg-[#f3d6d2] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#8d2f23]">
          Admin only
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-[rgba(20,33,61,0.08)] bg-white/70 p-4">
          <div className="text-sm font-semibold text-[#14213d]">Create user</div>
          <div className="mt-4 grid gap-3">
            <input
              aria-label="New username"
              className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
              placeholder="Username"
              value={draft.username}
              onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))}
            />
            <input
              aria-label="New password"
              className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
              placeholder="Password"
              type="password"
              value={draft.password}
              onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
            />
            <select
              aria-label="New user role"
              className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
              value={draft.role}
              onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="viewer">viewer</option>
              <option value="analyst">analyst</option>
              <option value="admin">admin</option>
            </select>
            <button
              onClick={onCreate}
              disabled={disabled || !draft.username || !draft.password}
              className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              Create user
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-[rgba(20,33,61,0.08)] bg-white/70 p-4">
          <div className="text-sm font-semibold text-[#14213d]">Existing users</div>
          <div className="mt-4 grid gap-3">
            {users.map((user) => (
              <div key={user.id} className="rounded-2xl border border-[rgba(20,33,61,0.08)] bg-white/80 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#14213d]">{user.username}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#5f6b7a]">
                      Created {formatTimestamp(user.createdAt)}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[140px_1fr_auto]">
                    <select
                      aria-label={`Role for ${user.username}`}
                      className="rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
                      value={user.draftRole ?? user.role}
                      onChange={(event) => updateDraft(user.id, { draftRole: event.target.value })}
                    >
                      <option value="viewer">viewer</option>
                      <option value="analyst">analyst</option>
                      <option value="admin">admin</option>
                    </select>
                    <input
                      aria-label={`Password for ${user.username}`}
                      className="rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-2"
                      placeholder="Optional new password"
                      type="password"
                      value={user.draftPassword ?? ""}
                      onChange={(event) => updateDraft(user.id, { draftPassword: event.target.value })}
                    />
                    <button
                      onClick={() => onApplyRole(user)}
                      disabled={disabled}
                      className="rounded-xl bg-[#2a9d8f] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 ? <p className="text-sm text-[#5f6b7a]">No users found.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuditLogPanel({ logs }) {
  const rows = logs.map((log) => ({
    time: formatTimestamp(log.createdAt),
    actor: log.actorUsername ?? "system",
    action: log.action,
    target: `${log.targetType}${log.targetId ? `:${log.targetId}` : ""}`,
  }));

  return (
    <DataTable
      title="Audit Log"
      columns={[
        { key: "time", label: "Time" },
        { key: "actor", label: "Actor" },
        { key: "action", label: "Action" },
        { key: "target", label: "Target" },
      ]}
      rows={rows}
      emptyLabel="No audit events recorded yet."
    />
  );
}

export function AuthScreen({ auth, setAuth, authState, error, loading, handleLogin }) {
  return (
    <main className="shell">
      <div className="mx-auto max-w-4xl panel p-8 fade-in-up">
        <div className="text-xs uppercase tracking-[0.25em] text-[#c44536]">Secure Access</div>
        <h1 className="mt-3 text-4xl font-semibold text-[#14213d]">Traffic Correlation Control Portal</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5f6b7a]">
          Sign in to access simulations, replay analysis, animated topology inspection, PCAP protocol
          fingerprinting, exportable reports, and live capture workflows.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl bg-white/80 p-6">
            <div className="text-sm font-semibold text-[#14213d]">Login</div>
            <div className="mt-4 grid gap-3">
              <input
                aria-label="Login username"
                className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-3"
                placeholder="Username"
                value={auth.username}
                onChange={(event) => setAuth((current) => ({ ...current, username: event.target.value }))}
              />
              <input
                aria-label="Login password"
                className="w-full rounded-xl border border-[rgba(20,33,61,0.1)] px-3 py-3"
                placeholder="Password"
                type="password"
                value={auth.password}
                onChange={(event) => setAuth((current) => ({ ...current, password: event.target.value }))}
              />
              <button
                onClick={handleLogin}
                disabled={loading || !auth.username || !auth.password}
                className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Sign in
              </button>
              {error ? <p className="text-sm text-[#8d2f23]">{error}</p> : null}
            </div>
          </div>

          <div className="rounded-3xl bg-[#14213d] p-6 text-[#f5f0e8]">
            <div className="text-sm uppercase tracking-[0.2em] text-[#d7f0ec]">Demo Roles</div>
            <div className="mt-4 space-y-3">
              {(authState.demoAccounts ?? []).map((account) => (
                <div key={account.username} className="rounded-2xl bg-white/8 p-3">
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d7f0ec]">
                    {account.role}
                  </div>
                  <div className="mt-1 text-sm">Username: {account.username}</div>
                  <div className="mt-1 text-sm">Password: {account.password}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
