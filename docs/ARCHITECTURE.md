# Architecture

```
                ┌───────────────────────────┐        ┌──────────────────────────────┐
  Browser ─────▶│  web/  (React PWA, static) │        │  mobile/ (Flutter, code only) │
                └─────────────┬─────────────┘        └──────────────┬───────────────┘
                              │  same origin: /api, /admin           │ API_BASE_URL
                              ▼                                      ▼
                ┌──────────────────────────────────────────────────────────────────┐
                │ backend/  Django 5.2 + DRF                                        │
                │  /api/…  token auth · permission + scoping checks · OpenAPI       │
                │  /admin/ clinic setup, staff, role permissions, catalog, methods  │
                └───────────────────────────────┬──────────────────────────────────┘
                                                ▼
                                SQLite (dev/tests) · PostgreSQL (prod, CI)
```

## Repository layout

| Path | Owner agent | Contents |
|---|---|---|
| `business-logic/` | Team Leader (approval) | Product source of truth. **Not modified.** |
| `sprints/` | BA | Sprint plans, statuses, gate logs, [traceability](../sprints/TRACEABILITY.md) |
| `docs/` | Team Leader | API contract, decisions/CRs, architecture, workflow |
| `backend/` | Backend | Django project `config/`, domain apps in `apps/` |
| `web/` | PWA | Vite + React + TypeScript PWA |
| `mobile/` | Flutter | Flutter/Dart client (never executed in the MVP) |
| `qa/` | QA | API acceptance tests (`qa/api`), Playwright Web/PWA tests (`qa/e2e`), reports |
| `.github/workflows/ci.yml` | Team Leader | CI gates |

## Backend

Each domain is a Django app in `backend/apps/`:

| App | Models | Responsibility |
|---|---|---|
| `core` | — | Shared plumbing: permissions (`IsClinicMember`, `ActionPermission`), row scoping (`scoping.py`), phone normalisation, error format, pagination, health, `seed_demo` |
| `clinics` | `Clinic` | Clinic with one or many doctors |
| `accounts` | `User`, `Role` | Phone-number login, role, clinic, staff→doctor assignment, role groups and default permissions (`roles.py`), auth backend |
| `patients` | `Patient` | Registration, minor/guardian rules, doctor association |
| `catalog` | `Procedure`, `Medication` | Clinical catalog managed in Django Admin (global or per clinic) |
| `appointments` | `Appointment` | Booking, check-in, cancel, queue, amount due |
| `visits` | `Visit`, `VisitProcedure`, `VisitMedication` | Active visit, clinical recording, follow-ups, completion, history |
| `payments` | `PaymentMethod`, `Payment` | Payments, billing summary, patient balance |

### Access control, in three layers

1. **Authentication**: DRF token (`Authorization: Token …`). The token is
   issued by `POST /api/auth/login/` after phone + password
   (`PhoneRoleBackend`).
2. **Permissions**: each viewset declares
   `action_permissions = {"create": ("patients.add_patient",), …}`.
   Undeclared actions are denied. The user's role grants the permissions of
   the matching Django group, and admins may add more
   ([matrix](DECISIONS.md#permission-matrix)).
3. **Row scoping**: `apps/core/scoping.py` limits every queryset to the
   user's clinic and permitted doctors, so out-of-scope records return 404.
   The owning-doctor rule for active visits lives in `visits/services.py`.

### Business rules live in services

State transitions sit in `services.py` modules, each in one transaction with
row locks:

* `appointments/services.py`: check-in, cancel
* `visits/services.py`: start visit, record, complete, follow-up
* `payments/services.py`: amount due, payments

One patient can be in only one active visit. The service checks this, and the
database enforces it with the partial unique constraint
`one_active_visit_per_patient`. A race lost at the database becomes the same
`409 active_visit_exists` response.

### Configuration

Everything comes from environment variables (`backend/.env.example`):
`DJANGO_DEBUG`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL`,
`DJANGO_TIME_ZONE`, `CORS_ALLOWED_ORIGINS`, `DJANGO_CSRF_TRUSTED_ORIGINS`,
`LOGIN_THROTTLE_RATE`. Static files are served by WhiteNoise.

## Web / PWA

* `src/api/`: typed fetch client (`client.ts`), contract types (`types.ts`), endpoints.
* `src/auth/`: token storage, `/me` restore, `hasPerm`, route guards
  (`RequireAuth`, `RequireRole`, `RequirePermission`), role metadata.
* `src/pages/`: role login pages, role dashboards, patients, appointments (with billing), visit.
* PWA: `vite-plugin-pwa` (Workbox `generateSW`) precaches the app shell. API
  and admin requests are never cached, so clinical data is always live. There
  is an offline banner and an install prompt, and the icons are generated from
  `public/*.svg`.
* In dev and preview, `/api` and `/admin` are proxied to the backend
  (`VITE_PROXY_TARGET`), matching a same-origin production deployment.

## Flutter

`mobile/` mirrors the PWA features with `provider`, `http` and
`flutter_secure_storage`. It is written and reviewed only, never run
(see `mobile/README.md`).

## Quality gates (CI)

| Job | Gate |
|---|---|
| Backend (SQLite, PostgreSQL) | ruff lint + format, migrations up to date, pytest with coverage, OpenAPI contract drift check |
| Web/PWA | oxlint, TypeScript, Vitest, production build |
| QA | API acceptance (pytest), Web + PWA end-to-end (Playwright, desktop + mobile Chromium) |
| Flutter | none: runtime testing is disabled for the MVP |
