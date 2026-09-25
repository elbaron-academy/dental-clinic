# Sprint 01 — Foundation

Status: DONE (Team Leader approved)

## Goals
- Establish repository structure.
- Set up Django/DRF backend.
- Set up Web/PWA project.
- Set up Flutter project files without runtime execution.
- Establish shared documentation and agent workflow.
- Establish database configuration and development conventions.

## Requirements
FND-001, FND-002, FND-003, FND-004, FND-005, FND-006 (see [TRACEABILITY.md](TRACEABILITY.md)).

## Tasks
| Task | Agent | Requirements | Status |
|---|---|---|---|
| S01-BA-01 Requirement IDs, traceability matrix, change requests | BA | all | DONE |
| S01-BE-01 Django 5.2 + DRF project (`backend/`), env-driven settings, SQLite dev / PostgreSQL prod via `DATABASE_URL` | Backend | FND-002, FND-005 | DONE |
| S01-BE-02 Health endpoint, OpenAPI schema (`/api/schema/`), API docs page | Backend | FND-002, FND-006 | DONE |
| S01-BE-03 Conventions: ruff, pytest, app layout `apps/<domain>` | Backend | FND-005 | DONE |
| S01-PWA-01 Vite + React + TypeScript PWA (`web/`), manifest, service worker, icons | PWA | FND-003 | DONE |
| S01-PWA-02 API client, lint, typecheck, unit test setup | PWA | FND-003 | DONE |
| S01-FL-01 Flutter project files (`mobile/`), API client skeleton — code only | Flutter | FND-004 | DONE |
| S01-TL-01 CI workflow (backend on SQLite + PostgreSQL, web, e2e) | Team Leader | FND-005 | DONE |
| S01-TL-02 README, architecture and API contract docs | Team Leader | FND-001, FND-006 | DONE |

## Gate
Team Leader reviews foundation before feature implementation.

## Delivery
| Layer | Where |
|---|---|
| Backend | `backend/` (`config/settings.py` env-driven, SQLite dev / PostgreSQL via `DATABASE_URL`), `apps/core` (health, errors, permissions, scoping), ruff + pytest |
| PWA | `web/` Vite + React + TypeScript, `vite-plugin-pwa`, icons, oxlint, Vitest |
| Flutter | `mobile/` pubspec, analysis options, API client (code only) |
| Docs / CI | `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/api/openapi.yaml`, `docs/DECISIONS.md`, `.github/workflows/ci.yml` |

## Gate log
| Step | Result | Notes |
|---|---|---|
| BA plan → Team Leader | APPROVED | Requirement IDs, traceability matrix and CR-001..CR-020 accepted as implementation defaults. Business logic left unchanged. |
| Foundation → Team Leader | APPROVED | Backend test suite also runs on PostgreSQL 16. The OpenAPI schema generates with 0 warnings. |
