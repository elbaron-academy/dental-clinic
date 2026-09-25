# Sprint 01 — Foundation

Status: BACKLOG

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
| S01-BA-01 Requirement IDs, traceability matrix, change requests | BA | all | BACKLOG |
| S01-BE-01 Django 5.2 + DRF project (`backend/`), env-driven settings, SQLite dev / PostgreSQL prod via `DATABASE_URL` | Backend | FND-002, FND-005 | BACKLOG |
| S01-BE-02 Health endpoint, OpenAPI schema (`/api/schema/`), API docs page | Backend | FND-002, FND-006 | BACKLOG |
| S01-BE-03 Conventions: ruff, pytest, app layout `apps/<domain>` | Backend | FND-005 | BACKLOG |
| S01-PWA-01 Vite + React + TypeScript PWA (`web/`), manifest, service worker, icons | PWA | FND-003 | BACKLOG |
| S01-PWA-02 API client, lint, typecheck, unit test setup | PWA | FND-003 | BACKLOG |
| S01-FL-01 Flutter project files (`mobile/`), API client skeleton — code only | Flutter | FND-004 | BACKLOG |
| S01-TL-01 CI workflow (backend on SQLite + PostgreSQL, web, e2e) | Team Leader | FND-005 | BACKLOG |
| S01-TL-02 README, architecture and API contract docs | Team Leader | FND-001, FND-006 | BACKLOG |

## Gate
Team Leader reviews foundation before feature implementation.
