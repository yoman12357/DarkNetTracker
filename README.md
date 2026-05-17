# DarkNetTracker

## Traffic Correlation Research Platform

DarkNetTracker is a full-stack cybersecurity research project focused on traffic correlation analysis in controlled anonymous-network laboratory scenarios. It combines a Python-based analysis engine, an Express backend API, SQLite persistence, and a Next.js dashboard for monitoring, exporting, and reviewing analysis sessions.

---

## Developer Information

**Developer Name:** Aryan Bokolia  
**College:** National Institute of Technology Karnataka (NITK), Surathkal  
**Program:** B.Tech in Computer Science and Engineering  
**Location:** Mangaluru, India  
**Age:** 20  
**GitHub:** [yoman12357](https://github.com/yoman12357)  
**Project Repository:** [DarkNetTracker](https://github.com/yoman12357/DarkNetTracker)

---

## Project Overview

This project was built as a cybersecurity and network-analysis platform for studying correlation techniques on simulated and controlled traffic datasets. The system supports multiple data-input modes, secure API access, real-time dashboard updates, report export, and structured operational controls.

The project is suitable for:

- cybersecurity research
- traffic-analysis lab demonstrations
- packet and session correlation experiments
- secure full-stack engineering portfolio work
- academic project presentation and resume use

---


## Core Features

### Analysis Modes

- Simulation-based analysis
- Replay analysis using structured datasets
- PCAP file analysis
- Live traffic capture workflow

### Backend Features

- Express.js REST API
- Role-based access control
- Token-based authentication
- CSRF protection for authenticated write routes
- CORS restrictions
- Rate limiting
- Upload validation
- Audit logging
- Database migration support
- Runtime metrics endpoint

### Frontend Features

- Next.js dashboard
- Session monitoring interface
- Visualization of paths and estimates
- Export actions for CSV and PDF
- Loading and error states
- Basic unit-test coverage

### Python Engine Features

- Feature extraction from captured or replayed traffic
- Correlation scoring
- Ranked path generation
- Probabilistic region estimation
- Runtime validation using Pydantic
- Structured progress logging

---

## Tech Stack

### Programming Languages

- Python
- JavaScript
- SQL

### Frameworks and Libraries

- Next.js
- React
- Express.js
- Node.js
- WebSockets
- Vitest
- Testing Library
- Pydantic

### Database and Storage

- SQLite

### Security and Operations

- Helmet
- CSRF protection
- Rate limiting
- Request validation
- Audit logging
- GitHub Actions

---

## Skills Demonstrated Through This Project

- Full-stack web development
- Cybersecurity project design
- Secure backend engineering
- API development
- Authentication and authorization
- Network traffic analysis
- Data processing pipelines
- Real-time communication using WebSockets
- Testing and debugging
- Documentation and deployment preparation

---

## Project Structure

```text
DarkNetTracker/
├── backend/        # Express backend, auth, DB, security, queue, metrics
├── frontend/       # Next.js dashboard
├── capture/        # Traffic input modes: simulate, replay, pcap, live
├── processing/     # Feature extraction, correlation, ranking, estimation
├── data/           # Sample datasets
├── tests/          # Python validation and pipeline tests
├── docs/           # Project report, architecture, deployment, API docs
├── engine_api.py   # Python bridge used by backend jobs
├── service.py      # Core analysis pipeline
└── README.md
```

---

## How To Run This Project Locally

### 1. Clone the Repository

```bash
git clone https://github.com/yoman12357/DarkNetTracker.git
cd DarkNetTracker
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Install Backend Dependencies

```bash
npm --prefix backend install
```

### 4. Install Frontend Dependencies

```bash
npm --prefix frontend install
```

### 5. Create Environment Files

Backend:

```bash
cp backend/.env.example backend/.env
```

Frontend:

```bash
cp frontend/.env.local.example frontend/.env.local
```

If you are using Windows PowerShell and `cp` does not work, use:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.local.example frontend\.env.local
```

### 6. Start the Backend

```bash
npm --prefix backend run dev
```

The backend runs on:

```text
http://localhost:4000
```

### 7. Start the Frontend

```bash
npm --prefix frontend run dev
```

The frontend runs on:

```text
http://localhost:3000
```

---

## Default Development Login

In local development, the bootstrap endpoint exposes demo credentials.

Typical development accounts:

- Admin: `admin / admin123`
- Analyst: `analyst / analyst123`
- Viewer: `viewer / viewer123`

For production deployment, these should be changed immediately.

---

## Useful Commands

### Apply Database Migrations

```bash
npm --prefix backend run migrate
```

### Run Python Validation Tests

```bash
python -m pytest tests/test_validation.py -q
```

### Run Backend API Smoke Tests

```bash
npm --prefix backend run test:api
```

### Run Frontend Unit Tests

```bash
npm --prefix frontend run test
```

### Build Frontend for Production

```bash
npm --prefix frontend run build
```

---

## API and Security Notes

The backend includes:

- bearer-token authentication
- CSRF token validation for authenticated write operations
- restricted CORS policy
- request validation
- file upload validation
- audit logs
- runtime metrics

Authenticated write requests require:

- `Authorization: Bearer <token>`
- `X-CSRF-Token: <token returned at login>`

---

## Documentation

- [Implementation Todo](docs/IMPLEMENTATION_TODO.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment Runbook](docs/DEPLOYMENT_RUNBOOK.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Security Checklist](docs/SECURITY_CHECKLIST.md)
- [OpenAPI Specification](docs/API_OPENAPI.yaml)
- [Project Report Source](docs/PROJECT_REPORT.tex)
- [Project Report PDF](docs/PROJECT_REPORT.pdf)

---

## Verification Status

The current project version has been checked with:

- Python validation tests
- backend API smoke tests
- frontend unit tests
- frontend production build
- backend startup smoke test
- login and CSRF-protected logout flow

---

## Resume-Friendly Summary

DarkNetTracker is a cybersecurity research and full-stack engineering project demonstrating secure API design, traffic-analysis workflows, packet/session correlation logic, real-time dashboarding, testing, and deployment-ready project structuring.

---

## Note

This project is intended for controlled research, lab analysis, and academic demonstration. It should be presented as a cybersecurity research platform, not as a real-world deanonymization tool.
