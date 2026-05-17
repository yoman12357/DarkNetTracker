"use client";

import { useEffect, useMemo, useState } from "react";

import { ANALYST_ROLES, API_BASE, downloadBlob } from "../lib/dashboard-utils";

export function useDashboard() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [simulateForm, setSimulateForm] = useState({ sessions: 18, seed: 7, topK: 8 });
  const [liveForm, setLiveForm] = useState({ interfaceName: "any", captureSeconds: 8, topK: 8 });
  const [replayFile, setReplayFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState({
    token: "",
    csrfToken: "",
    username: "",
    password: "",
    expiresAt: "",
  });
  const [authState, setAuthState] = useState({
    loggedIn: false,
    user: null,
    bootstrap: null,
    demoAccounts: [],
    tokenTtlHours: 8,
  });
  const [userDraft, setUserDraft] = useState({ username: "", password: "", role: "viewer" });

  const canRunAnalysis = ANALYST_ROLES.has(authState.user?.role);
  const isAdmin = authState.user?.role === "admin";

  function hardLogout() {
    setAuth({ token: "", csrfToken: "", username: "", password: "", expiresAt: "" });
    setAuthState((current) => ({ ...current, loggedIn: false, user: null }));
    setSessions([]);
    setSelectedSessionId(null);
    setSelectedSession(null);
    setUsers([]);
    setAuditLogs([]);
  }

  async function authorizedFetch(url, options = {}) {
    const method = options.method ?? "GET";
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${auth.token}`,
        ...(method !== "GET" ? { "X-CSRF-Token": auth.csrfToken } : {}),
      },
    });
    if (response.status === 401) {
      hardLogout();
      throw new Error("Your session expired. Please sign in again.");
    }
    return response;
  }

  async function refreshSessions() {
    const response = await authorizedFetch(`${API_BASE}/api/sessions`, { cache: "no-store" });
    const data = await response.json();
    setSessions(data.sessions ?? []);
    if (!selectedSessionId && (data.sessions ?? []).length > 0) {
      setSelectedSessionId(data.sessions[0].id);
    }
  }

  async function refreshSelectedSession(sessionId) {
    if (!sessionId) {
      setSelectedSession(null);
      return;
    }
    const response = await authorizedFetch(`${API_BASE}/api/sessions/${sessionId}`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setSelectedSession(data);
    }
  }

  async function refreshUsers() {
    if (!isAdmin) {
      setUsers([]);
      return;
    }
    const response = await authorizedFetch(`${API_BASE}/api/users`, { cache: "no-store" });
    const data = await response.json();
    setUsers(
      (data.users ?? []).map((user) => ({
        ...user,
        draftRole: user.role,
        draftPassword: "",
      })),
    );
  }

  async function refreshAuditLogs() {
    if (!isAdmin) {
      setAuditLogs([]);
      return;
    }
    const response = await authorizedFetch(`${API_BASE}/api/audit-logs?limit=100`, {
      cache: "no-store",
    });
    const data = await response.json();
    setAuditLogs(data.logs ?? []);
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/bootstrap`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setAuthState((current) => ({
          ...current,
          bootstrap: data.defaultUser,
          demoAccounts: data.demoAccounts ?? [],
          tokenTtlHours: data.auth?.tokenTtlHours ?? 8,
        }));
        if (data.defaultUser) {
          setAuth((current) => ({
            ...current,
            username: data.defaultUser?.username ?? "",
            password: data.defaultUser?.password ?? "",
          }));
        }
      })
      .catch(() => {
        setError("Failed to reach the backend bootstrap endpoint.");
      })
      .finally(() => {
        setBootstrapping(false);
      });
  }, []);

  useEffect(() => {
    if (authState.loggedIn) {
      refreshSessions().catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
    }
  }, [authState.loggedIn]);

  useEffect(() => {
    if (authState.loggedIn) {
      refreshSelectedSession(selectedSessionId).catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
    }
  }, [selectedSessionId, authState.loggedIn]);

  useEffect(() => {
    if (authState.loggedIn && isAdmin) {
      refreshUsers().catch((err) => setError(err instanceof Error ? err.message : String(err)));
      refreshAuditLogs().catch((err) => setError(err instanceof Error ? err.message : String(err)));
    }
  }, [authState.loggedIn, isAdmin, auth.token]);

  useEffect(() => {
    if (!authState.loggedIn) {
      return undefined;
    }

    const socket = new WebSocket(API_BASE.replace("http", "ws") + "/ws/live");
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "session.created" || message.type === "session.updated") {
        refreshSessions().catch(() => {});
        if (selectedSessionId) {
          refreshSelectedSession(selectedSessionId).catch(() => {});
        }
        if (isAdmin) {
          refreshAuditLogs().catch(() => {});
        }
      }
    };

    return () => socket.close();
  }, [selectedSessionId, authState.loggedIn, isAdmin]);

  async function safeAction(action) {
    setLoading(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    await safeAction(async () => {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: auth.username, password: auth.password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Login failed");
      }
      setAuth((current) => ({
        ...current,
        token: data.token,
        csrfToken: data.csrfToken ?? "",
        expiresAt: data.expiresAt ?? "",
      }));
      setAuthState((current) => ({ ...current, loggedIn: true, user: data.user }));
    });
  }

  async function handleLogout() {
    await safeAction(async () => {
      await authorizedFetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
      hardLogout();
    });
  }

  async function startSimulation() {
    await safeAction(async () => {
      const response = await authorizedFetch(`${API_BASE}/api/sessions/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simulateForm),
      });
      const session = await response.json();
      if (!response.ok) {
        throw new Error(session.error ?? "Simulation request failed");
      }
      setSelectedSessionId(session.id);
      await refreshSessions();
    });
  }

  async function uploadDataset(endpoint) {
    if (!replayFile) return;
    await safeAction(async () => {
      const body = new FormData();
      body.set("dataset", replayFile);
      body.set("topK", String(simulateForm.topK));
      const response = await authorizedFetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body,
      });
      const session = await response.json();
      if (!response.ok) {
        throw new Error(session.error ?? "Upload failed");
      }
      setSelectedSessionId(session.id);
      await refreshSessions();
    });
  }

  async function startLiveCapture() {
    await safeAction(async () => {
      const response = await authorizedFetch(`${API_BASE}/api/sessions/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(liveForm),
      });
      const session = await response.json();
      if (!response.ok) {
        throw new Error(session.error ?? "Live capture failed");
      }
      setSelectedSessionId(session.id);
      await refreshSessions();
    });
  }

  async function exportCsv() {
    if (!selectedSessionId) return;
    await safeAction(async () => {
      const response = await authorizedFetch(`${API_BASE}/api/sessions/${selectedSessionId}/export.csv`);
      if (!response.ok) {
        throw new Error("CSV export failed");
      }
      const blob = await response.blob();
      downloadBlob(blob, `${selectedSession?.inputLabel ?? "session"}-report.csv`);
    });
  }

  async function exportPdf() {
    if (!selectedSessionId) return;
    await safeAction(async () => {
      const response = await authorizedFetch(`${API_BASE}/api/sessions/${selectedSessionId}/export.pdf`);
      if (!response.ok) {
        throw new Error("PDF export failed");
      }
      const blob = await response.blob();
      downloadBlob(blob, `${selectedSession?.inputLabel ?? "session"}-report.pdf`);
    });
  }

  async function createUser() {
    await safeAction(async () => {
      const response = await authorizedFetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userDraft),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "User creation failed");
      }
      setUserDraft({ username: "", password: "", role: "viewer" });
      await refreshUsers();
      await refreshAuditLogs();
    });
  }

  function updateUserDraft(userId, patch) {
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...patch } : user)));
  }

  async function saveUser(user) {
    await safeAction(async () => {
      const response = await authorizedFetch(`${API_BASE}/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: user.draftRole,
          password: user.draftPassword || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "User update failed");
      }
      await refreshUsers();
      await refreshAuditLogs();
    });
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
      (selectedSession?.result?.correlations ?? []).slice(0, 10).map((item) => ({
        hop: `${item.left_node_type} → ${item.right_node_type}`,
        pair: `${item.left_node_id} → ${item.right_node_id}`,
        score: item.final_score.toFixed(3),
        time: item.time_delta.toFixed(3),
        size: item.size_delta,
        session: item.session_match ? "match" : "mix",
      })),
    [selectedSession],
  );

  const protocolRows = useMemo(
    () => (selectedSession?.result?.protocolSummary ?? []).slice(0, 8),
    [selectedSession],
  );

  return {
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    selectedSession,
    users,
    auditLogs,
    simulateForm,
    setSimulateForm,
    liveForm,
    setLiveForm,
    replayFile,
    setReplayFile,
    loading,
    bootstrapping,
    error,
    auth,
    setAuth,
    authState,
    userDraft,
    setUserDraft,
    canRunAnalysis,
    isAdmin,
    estimateRows,
    pathRows,
    correlationRows,
    protocolRows,
    evaluation: selectedSession?.result?.evaluation,
    handleLogin,
    handleLogout,
    startSimulation,
    uploadDataset,
    startLiveCapture,
    exportCsv,
    exportPdf,
    createUser,
    updateUserDraft,
    saveUser,
    refreshSessions: () => safeAction(refreshSessions),
  };
}
