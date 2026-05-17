# DarkNetTracker Implementation Todo

Last updated: 2026-05-17

## In Progress

- [x] Priority 1 hardening pass
  - [x] Replace production demo-credential startup behavior with enforced configuration
  - [x] Add environment-aware backend config and optional TLS bootstrap
  - [x] Tighten CORS, CSRF, upload validation, and request validation
  - [x] Add centralized error handling and graceful shutdown
  - [x] Add migration runner and production env examples
  - [x] Add CI workflow and monitoring/deployment docs

## Next

- [x] Frontend resilience pass
  - [x] Error boundary
  - [x] Loading and empty states
  - [x] Accessibility improvements for forms, tables, and actions

- [x] Python engine reliability pass
  - [x] Pydantic runtime validation
  - [x] Structured progress logging
  - [x] Better subprocess failure reporting and retry semantics

- [x] Baseline testing pass
  - [x] Backend API smoke tests
  - [x] Frontend unit tests with Vitest
  - [x] Frontend production build verification

- [x] Documentation parity pass
  - [x] README aligned to actual implementation status
  - [x] Project report corrected and rebuilt to PDF
  - [x] API, architecture, troubleshooting, deployment, and security docs refreshed

## Backlog

- [ ] E2E and frontend unit tests
- [ ] Browser-level E2E coverage beyond current smoke/unit tests
- [ ] OpenAPI/Swagger publication pipeline
- [ ] Redis cache / queue layer
- [ ] Kubernetes and Helm manifests
- [ ] Result comparison and batch-analysis features
