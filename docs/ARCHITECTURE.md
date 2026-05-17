# Architecture

## Runtime Topology

```text
Next.js Frontend
  -> REST + WebSocket
Express Backend
  -> Auth + CSRF + CORS + Rate Limits
  -> SQLite persistence + migrations
  -> Job queue + Python subprocess bridge
Python Analysis Engine
  -> Capture
  -> Feature extraction
  -> Correlation
  -> Path ranking
  -> Region estimation
  -> Report rendering
```

## Data Flow

1. A user authenticates through the backend and receives a bearer token plus CSRF token.
2. The frontend submits a simulation, replay, PCAP, or live-capture job.
3. The backend validates the request, persists a session/job record, and queues analysis.
4. The job worker launches `engine_api.py`, captures structured JSON output, and retries transient failures.
5. Results are stored in SQLite and broadcast over WebSocket to the dashboard.
6. The frontend renders metrics, ranked paths, protocol summaries, and export actions.
