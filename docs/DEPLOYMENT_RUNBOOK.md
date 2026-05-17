# Deployment Runbook

## Development

1. Copy `backend/.env.example` to `backend/.env`.
2. Copy `frontend/.env.local.example` to `frontend/.env.local`.
3. Install dependencies with `npm --prefix backend install`, `npm --prefix frontend install`, and `pip install -r requirements.txt`.
4. Start the backend with `npm --prefix backend run dev`.
5. Start the frontend with `npm --prefix frontend run dev`.

## Production

1. Set strong non-demo credentials in backend environment variables.
2. Set `ALLOWED_ORIGINS` to the deployed frontend origin.
3. Set `CSRF_SECRET` to a long random value.
4. If terminating TLS in Node, set `TLS_ENABLED=true`, `TLS_KEY_PATH`, and `TLS_CERT_PATH`.
5. Run `npm --prefix backend run migrate` before first start.
6. Start the backend and verify `/api/health` and `/api/ready`.
7. Build the frontend with `npm --prefix frontend run build` and start with `npm --prefix frontend run start`.

## Operational Checks

- Health: `GET /api/health`
- Readiness: `GET /api/ready`
- Login flow: verify token and CSRF token are returned
- Upload flow: verify replay and PCAP validation blocks unsupported file types
- Logs: inspect `logs/info.log`, `logs/warn.log`, and `logs/error.log`
