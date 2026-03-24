# Traffic Correlation Platform

Full-stack controlled traffic-correlation platform for anonymous-routing-style research. The project now includes:

- a Python analysis engine
- an Express.js backend with REST and WebSocket updates
- a Next.js + Tailwind dashboard
- SQLite-backed persistence and queued job processing
- token-based authentication
- replay upload support for `JSONL` and `CSV`
- PCAP ingestion and optional live capture via `tshark`
- terminal and browser-based result inspection

## Scope

This project is built for controlled cybersecurity research, replay analysis, and lab demonstrations. It does not decrypt traffic, does not identify real users, and is not presented as a real-world deanonymization tool.

## Stack

### Analysis Engine

- Python 3
- feature extraction
- hop correlation
- path ranking
- probabilistic region estimation
- evaluation metrics

### Backend

- Express.js
- `multer` for replay uploads
- `ws` for live session updates
- SQLite persistence using `node:sqlite`
- token auth and queued execution
- Python child-process runner for engine execution

### Frontend

- Next.js App Router
- Tailwind CSS
- live dashboard with session queue, metrics, tables, and terminal report view

## Project Structure

```text
backend/     Express API and WebSocket server
frontend/    Next.js dashboard
capture/     simulation and replay loaders
processing/  correlation, graphing, estimation, evaluation
tests/       replay fixtures and Python tests
```

## Core Pipeline

`capture` -> `features` -> `correlator` -> `graph` -> `estimator` -> `evaluator` -> `terminal/web UI`

## Engine Commands

Simulation:

```bash
python3 main.py --mode simulate --sessions 16 --top-k 6
```

Replay from JSONL:

```bash
python3 main.py --mode replay --dataset tests/sample_data/replay_dataset.jsonl --top-k 6
```

Replay from CSV:

```bash
python3 main.py --mode replay --dataset tests/sample_data/replay_dataset.csv --top-k 6
```

Structured JSON result:

```bash
python3 engine_api.py --mode simulate --sessions 16 --top-k 6
```

PCAP analysis:

```bash
python3 main.py --mode pcap --dataset sample.pcap
```

Live capture:

```bash
python3 main.py --mode live --interface any --capture-seconds 8
```

## Full-Stack Setup

Install dependencies:

```bash
npm --prefix backend install
npm --prefix frontend install
```

Run backend:

```bash
npm --prefix backend run dev
```

Run frontend:

```bash
npm --prefix frontend run dev
```

Open:

```text
http://localhost:3000
```

Backend API:

```text
http://localhost:4000
```

## Backend API

- `GET /api/bootstrap`
- `POST /api/auth/login`
- `GET /api/health`
- `GET /api/sessions`
- `GET /api/sessions/:sessionId`
- `POST /api/sessions/simulate`
- `POST /api/sessions/replay`
- `POST /api/sessions/pcap`
- `POST /api/sessions/live`
- `WS /ws/live`

## Notes

- live capture and PCAP parsing require `tshark` to be installed on the host
- session and auth data are persisted in `backend/data/app.db`
- default backend demo credentials are exposed by `GET /api/bootstrap`

## Test

```bash
python3 -m unittest discover -s tests -v
```

## Demo Flow

1. Start the backend and frontend.
2. Open the dashboard in the browser.
3. Run a simulation from the left control panel.
4. Watch the session complete and inspect estimated regions, paths, and hop correlations.
5. Upload a replay dataset and compare the output with the simulation.

## Resume-Ready Highlights

- built a modular traffic-correlation engine in Python for controlled anonymous-routing analysis
- added structured engine output for API integration
- developed an Express backend with replay upload, persistent session storage, and WebSocket streaming
- created a Next.js + Tailwind dashboard with auth, charts, and live result inspection
- implemented session-aware correlation and evaluation metrics to reduce false positives
