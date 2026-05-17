# DARK Project - Getting Started Guide

## Quick Start (5 minutes)

### 1. Verify Your Setup
```bash
python3 check_setup.py
```
This will check all dependencies and configurations. All checks should pass.

### 2. Install Dependencies
```bash
npm --prefix backend install
npm --prefix frontend install
```

### 3. Start the Backend (Terminal 1)
```bash
npm --prefix backend run dev
```
Backend will start on **http://localhost:4000**

### 4. Start the Frontend (Terminal 2)
```bash
npm --prefix frontend run dev
```
Frontend will start on **http://localhost:3000**

### 5. Open in Browser
Navigate to **http://localhost:3000** and login with:
- **Username:** `admin`
- **Password:** `admin123`

---

## Features

### Analysis Modes
- **Simulate:** Generate synthetic traffic patterns
- **Replay:** Analyze saved JSONL or CSV datasets
- **PCAP:** Parse .pcap files (requires tshark)
- **Live:** Capture live network traffic (requires tshark)

### Role-Based Access
| Role | Can Create Sessions | Can View Sessions | Can Manage Users |
|------|-------------------|------------------|-----------------|
| Admin | ✅ | ✅ | ✅ |
| Analyst | ✅ | ✅ | ❌ |
| Viewer | ❌ | ✅ | ❌ |

### Export Formats
- PDF Reports
- CSV Data Export
- HTML Reports

---

## Testing

### Run Python Tests
```bash
npm run test:python
```

### Run Performance Benchmark
```bash
npm run benchmark:python
```

### Test Individual Modes
```bash
# Simulate mode
python3 main.py --mode simulate --sessions 16

# Replay from JSONL
python3 main.py --mode replay --dataset tests/sample_data/replay_dataset.jsonl

# Replay from CSV
python3 main.py --mode replay --dataset tests/sample_data/replay_dataset.csv

# PCAP analysis (requires tshark)
python3 main.py --mode pcap --dataset tests/sample_data/better_capture.pcap

# Live capture (requires tshark, sudo may be needed)
python3 main.py --mode live --interface any --capture-seconds 8
```

---

## Docker Deployment

### Build and Run
```bash
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000
- **Data:** Persisted in `./backend/data/`

### Docker Cleanup
```bash
docker-compose down -v
```

---

## Troubleshooting

### Issue: "tshark not found"
This is optional for basic operation. Only needed for PCAP/live capture.

**Fix:**
```bash
# Ubuntu/Debian
sudo apt-get install tshark

# macOS
brew install wireshark

# Then restart the application
```

### Issue: "Backend connection refused"
The frontend can't reach the backend.

**Fix:**
1. Ensure backend is running: `npm --prefix backend run dev`
2. Check `frontend/.env.local` has `NEXT_PUBLIC_API_BASE=http://localhost:4000`
3. Verify backend is on port 4000: `lsof -i :4000`

### Issue: "Module not found" errors
Dependencies aren't installed.

**Fix:**
```bash
npm --prefix backend install
npm --prefix frontend install
python3 check_setup.py
```

### Issue: "Permission denied" for live capture
Live packet capture requires elevated privileges.

**Fix:**
```bash
# Run with sudo
sudo python3 main.py --mode live --interface any
```

---

## Configuration

### Backend Environment (.env)
```
APP_DEFAULT_USER=admin
APP_DEFAULT_PASS=admin123
PORT=4000
HOST=0.0.0.0
AUTH_TOKEN_TTL_HOURS=8
```

### Frontend Environment (.env.local)
```
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

### Analysis Configuration (config.py)
Modify `config.py` to change:
- Correlation thresholds
- Scoring weights
- Top-K ranking size
- Region priors

---

## Project Structure

```
DARK/
├── backend/              # Express.js REST/WebSocket API
│   ├── server.js        # Main server
│   ├── auth.js          # Authentication
│   ├── db.js            # SQLite database
│   ├── queue.js         # Job queue
│   └── package.json
├── frontend/            # Next.js dashboard
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── package.json
├── capture/             # Data loaders
│   ├── simulate.py
│   ├── replay.py
│   ├── pcap.py
│   └── live.py
├── processing/          # Analysis pipeline
│   ├── correlator.py
│   ├── estimator.py
│   ├── evaluator.py
│   ├── features.py
│   └── graph.py
├── data/                # Data models & nodes
│   └── nodes.py
├── tests/               # Test suite
│   ├── sample_data/
│   └── test_*.py
├── main.py              # CLI entry point
├── engine_api.py        # JSON API entry point
├── service.py           # Pipeline orchestrator
├── config.py            # Configuration
├── check_setup.py       # Setup verification
├── requirements.txt     # Python dependencies
└── docker-compose.yml   # Docker configuration
```

---

## API Endpoints

### Public Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/bootstrap` - Get system info

### Protected Endpoints
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `GET /api/sessions` - List sessions
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions/simulate` - Create simulate session
- `POST /api/sessions/replay` - Create replay session (multipart/form-data)
- `POST /api/sessions/pcap` - Create PCAP session (multipart/form-data)
- `POST /api/sessions/live` - Create live capture session
- `GET /api/sessions/:id/export.pdf` - Export as PDF
- `GET /api/sessions/:id/export.csv` - Export as CSV
- `GET /api/sessions/:id/export.html` - Export as HTML

### Admin Endpoints
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `GET /api/audit-logs` - View audit logs

---

## Performance Notes

- Simulate mode is fastest (synthetic data)
- Replay mode depends on dataset size
- PCAP parsing depends on file size and tshark performance
- Live capture depends on network activity
- Use `--top-k` parameter to adjust ranking complexity

### Example: Benchmark
```bash
npm run benchmark:python
```

Measures pipeline performance across different dataset sizes.

---

## Security Notes

- Default credentials are for development only
- Change passwords in production via Admin panel
- Token expiration configurable via `AUTH_TOKEN_TTL_HOURS`
- All API calls require valid token except `/api/auth/login`
- Database uses SQLite with foreign key constraints
- Audit logging tracks all admin actions

---

## Support & Issues

See [ISSUES_AND_FIXES.md](ISSUES_AND_FIXES.md) for:
- Detailed architecture documentation
- List of all issues found and fixed
- Recommendations for enhancements
- Testing results

---

**Happy analyzing! 🔍**

For questions or issues, check the troubleshooting section above or review the detailed documentation in ISSUES_AND_FIXES.md.
