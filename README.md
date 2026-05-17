# DARK - Traffic Correlation Platform
## Distributed Anonymous Routing Correlation Kit

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A full-stack controlled traffic-correlation platform for anonymous-routing-style research, featuring real-time analysis, multi-format exports, and role-based access control.

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Updated**: May 17, 2026

## 📋 Quick Links

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Docs](#-api-endpoints)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Security](#-security)

## ✨ Features

### Core Analysis
- **4 Analysis Modes**: Simulate | Replay (JSONL/CSV) | PCAP | Live Capture
- **Hop Correlation**: Time & size-based packet matching with confidence scoring
- **Path Ranking**: Probabilistic ranking with multi-factor weighting
- **Region Estimation**: Geographic origin prediction with confidence intervals
- **Evaluation Metrics**: Accuracy assessment, false positive reduction

### Platform Capabilities
- **REST API**: Token-based auth with role-based access control
- **Real-time Updates**: WebSocket streaming for live session monitoring
- **Web Dashboard**: React/Next.js UI with Tailwind styling
- **Database**: SQLite with WAL mode for concurrent access
- **Job Queue**: Async processing with automatic retry logic
- **Audit Logging**: Complete action tracking for compliance

### Reporting & Export
- **Multi-Format Export**: PDF (styled), CSV (data), HTML (web-ready)
- **Terminal Reports**: ASCII-formatted correlation results
- **Session History**: Full metadata and configuration tracking
- **Real-time Dashboard**: Charts, metrics, live updates

## 🚀 Quick Start

```bash
# 1. Verify environment
python3 check_setup.py

# 2. Install dependencies
npm --prefix backend install && npm --prefix frontend install

# 3. Start backend (Terminal 1)
npm --prefix backend run dev     # http://localhost:4000

# 4. Start frontend (Terminal 2)
npm --prefix frontend run dev    # http://localhost:3000

# 5. Login
# Browser: http://localhost:3000
# Credentials: admin / admin123
```

**Or with Docker**:
```bash
docker-compose up --build
```

## 📦 Installation

### System Requirements
- **Python**: 3.8+ (tested with 3.13)
- **Node.js**: 18+ with npm 9+
- **Optional**: tshark (for PCAP/live modes)

### New Users

```bash
# Ubuntu/Debian
sudo apt-get install python3-dev python3-pip nodejs tshark

# macOS
brew install python@3.13 node tshark

# Windows: Use WSL2 or Docker
```

```bash
# Clone & setup
git clone https://github.com/youruser/DARK.git && cd DARK

# Verify
python3 check_setup.py

# Install
npm --prefix backend install
npm --prefix frontend install

# Run (see Quick Start above)
```

## ⚙ Configuration

**Backend** (`backend/.env`):
```ini
APP_DEFAULT_USER=admin
APP_DEFAULT_PASS=admin123
PORT=4000
HOST=0.0.0.0
AUTH_TOKEN_TTL_HOURS=8
NODE_ENV=production
```

**Frontend** (`frontend/.env.local`):
```ini
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

See [full configuration docs](GETTING_STARTED.md#configuration) for production settings.

## 📖 Usage

### CLI Examples

```bash
# Simulate traffic
python3 main.py --mode simulate --sessions 16 --seed 42

# Analyze JSONL dataset
python3 main.py --mode replay --dataset data.jsonl --top-k 8

# Parse PCAP file (requires tshark)
python3 main.py --mode pcap --dataset capture.pcap

# Live network capture
sudo python3 main.py --mode live --interface any --capture-seconds 10
```

### Web Dashboard

1. Navigate to **http://localhost:3000**
2. Login with demo credentials
3. Choose analysis mode from left panel
4. Configure parameters and submit
5. Monitor real-time progress
6. Export results (PDF/CSV/HTML)

### API Usage

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r .token)

# Run analysis
curl -X POST http://localhost:4000/api/sessions/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessions":16,"topK":8}'

# List sessions
curl http://localhost:4000/api/sessions \
  -H "Authorization: Bearer $TOKEN" | jq
```

See [API Documentation](#-api-endpoints) for full reference.

## 🧪 Testing

```bash
# Python tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=. --cov-report=html

# Validation tests
pytest tests/test_validation.py -v

# Benchmarks
pytest tests/benchmark_pipeline.py
```

## 🚢 Deployment

### Development (3 terminals)
```bash
npm --prefix backend run dev              # Terminal 1
npm --prefix frontend run dev             # Terminal 2
python3 check_setup.py  # Monitor         # Terminal 3
```

### Production (Docker)
```bash
docker-compose up -d
# Services: localhost:3000 (frontend), localhost:4000 (backend)
# Data: ./backend/data/ (persisted)
```

### Enterprise (Kubernetes)
```bash
helm install dark ./charts/dark \
  --namespace production \
  --values production-values.yaml
```

## 📚 Documentation

- [**ISSUES_AND_FIXES.md**](ISSUES_AND_FIXES.md) - Complete issue list & solutions
- [**GETTING_STARTED.md**](GETTING_STARTED.md) - Detailed setup guide
- [**API.md**](docs/API.md) - Full API documentation
- [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) - System design

## 🆘 Troubleshooting

### Backend Won't Start
```bash
# Check Python
which python3 && python3 --version

# Verify dependencies
python3 check_setup.py

# Check port
lsof -i :4000
```

### Frontend Connection Failed
```bash
# Verify backend running
curl http://localhost:4000/api/health

# Check config
cat frontend/.env.local
# Should have: NEXT_PUBLIC_API_BASE=http://localhost:4000
```

### PCAP/Live Capture Not Working
```bash
# Install tshark
sudo apt-get install tshark

# Or macOS
brew install wireshark
```

See [full troubleshooting guide](GETTING_STARTED.md#troubleshooting) for more.

## 🔒 Security

**Built-in Protection**:
- ✅ Rate limiting (100 req/15min, 5 for auth)
- ✅ Input validation on all parameters
- ✅ SQL injection protection
- ✅ CORS whitelist-based
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Token expiration (8 hours default)
- ✅ Password hashing with bcrypt
- ✅ Audit logging of all admin actions

**Production Hardening**:
1. Change default credentials
2. Enable HTTPS/TLS
3. Configure firewall rules
4. Setup automated backups
5. Enable security monitoring
6. Regular security audits

See [Security Policy](docs/SECURITY.md) for details.

## 📖 API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | /api/auth/login | ❌ | - | Authenticate user |
| POST | /api/auth/logout | ✅ | Any | Logout & revoke token |
| GET | /api/sessions | ✅ | Any | List all sessions |
| GET | /api/sessions/:id | ✅ | Any | Get session details |
| POST | /api/sessions/simulate | ✅ | Analyst+ | Create simulation |
| POST | /api/sessions/replay | ✅ | Analyst+ | Upload & analyze data |
| GET | /api/sessions/:id/export.pdf | ✅ | Any | Export as PDF |
| GET | /api/sessions/:id/export.csv | ✅ | Any | Export as CSV |
| GET | /api/users | ✅ | Admin | List users |
| POST | /api/users | ✅ | Admin | Create user |
| PATCH | /api/users/:id | ✅ | Admin | Update user |
| GET | /api/audit-logs | ✅ | Admin | View audit log |

## 🏗 Architecture

```
Frontend (Next.js) :3000
    ↓ REST + WebSocket ↑
Backend (Express) :4000
    ├─ Auth System
    ├─ Job Queue
    ├─ SQLite DB
    └─ Python Runner
         ↓
Analysis Engine (Python)
    ├─ Capture (Simulate/Replay/PCAP/Live)
    ├─ Processing (Features/Correlate/Rank/Estimate)
    └─ Output (Reports/API/WebSocket)
```

## 📄 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Analyst | analyst | analyst123 |
| Viewer | viewer | viewer123 |

⚠️ **Change in production!**

## 📊 Project Stats

- **Backend**: ~800 LOC (Node.js/JavaScript)
- **Frontend**: ~600 LOC (React/Next.js)
- **Engine**: ~1200 LOC (Python stdlib only)
- **Tests**: ~400 LOC (pytest)
- **Total**: ~3000 LOC

## 🎯 Use Cases

✅ Anonymous routing research  
✅ Traffic analysis lab demonstrations  
✅ Cybersecurity education  
✅ Protocol correlation studies  
✅ Network behavior analysis  

❌ **NOT** for: Real-world deanonymization or user identification

## 📞 Support

- 📖 [Full Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/youruser/DARK/issues)
- 💬 [Discussions](https://github.com/youruser/DARK/discussions)
- 🔐 [Security Policy](./docs/SECURITY.md)

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

Built for cybersecurity research and academic study of anonymous routing systems.

---

## 🌟 Resume Highlights

✨ Architected full-stack traffic correlation platform with Python analysis engine  
✨ Implemented Express backend with async job queue and real-time WebSocket  
✨ Built React/Next.js dashboard with role-based auth and multi-format exports  
✨ Designed SQLite persistence with audit logging and session management  
✨ Developed secure API with rate limiting, validation, and error handling  

**Getting Started**: See [GETTING_STARTED.md](GETTING_STARTED.md)  
**System Status**: See [ISSUES_AND_FIXES.md](ISSUES_AND_FIXES.md)  
**Next Steps**: Review [docs/](docs/) directory for architecture and deployment guides
