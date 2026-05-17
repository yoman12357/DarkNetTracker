# Troubleshooting

## Backend starts but login fails

- Confirm the backend is reachable at `http://localhost:4000/api/health`.
- Check `ALLOWED_ORIGINS` if requests come from a non-local frontend origin.
- Review `logs/warn.log` and `logs/error.log` for validation or auth failures.

## CSRF errors on authenticated actions

- Ensure the frontend includes `X-CSRF-Token` on non-GET API calls.
- Re-authenticate if the bearer token expired or logout revoked the token.

## Upload rejected

- Replay mode accepts `.jsonl`, `.json`, and `.csv`.
- PCAP mode accepts `.pcap` and `.pcapng`.
- Verify the upload size is under `UPLOAD_LIMIT_BYTES`.

## Python analysis fails

- Confirm `PYTHON_EXECUTABLE` points to a working interpreter.
- Install `pydantic` and other required packages with `pip install -r requirements.txt`.
- Review backend logs for retry attempts and stderr output.
