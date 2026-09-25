# Dental Clinic MVP

A small dental-clinic system: phone + password login for Doctors, Assistants
and Receptionists; patient registration; appointments and check-in; the
doctor's active visit (diagnosis, tooth/procedures, treatment, medications,
follow-ups); visit history; and basic payment tracking.

It was built by the agent team described in [AGENTS.md](AGENTS.md): BA → Backend →
Team Leader → PWA/Web + Flutter → Team Leader → QA, from the product rules in
[`business-logic/`](business-logic/).

| Part | Stack | Status |
|---|---|---|
| [`backend/`](backend/) | Django 5.2 + Django REST Framework, SQLite/PostgreSQL | Done, QA passed |
| [`web/`](web/) | React 19 + TypeScript + Vite, installable PWA | Done, QA passed |
| [`mobile/`](mobile/) | Flutter (code only; not run by design) | Done, TL-reviewed |
| [`qa/`](qa/) | pytest API acceptance + Playwright Web/PWA e2e | [QA report](qa/reports/QA_REPORT.md) |

**Start here:** [Architecture](docs/ARCHITECTURE.md) ·
[API contract](docs/API.md) ([OpenAPI](docs/api/openapi.yaml)) ·
[Decisions & change requests](docs/DECISIONS.md) ·
[Sprints](sprints/README.md) · [Traceability](sprints/TRACEABILITY.md)

## Quick start (development)

Prerequisites: Python 3.11+, Node 22+.

```bash
# 1. Backend on http://127.0.0.1:8000
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
export DJANGO_DEBUG=true            # SQLite in backend/db.sqlite3 by default
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo --sample-patients   # demo clinics, staff, catalog
.venv/bin/python manage.py runserver

# 2. Web/PWA on http://localhost:5173 (proxies /api and /admin to the backend)
cd ../web
npm install
npm run dev
```

### Demo accounts (password `demo-pass-123`)

| Clinic | Role | Phone | Name |
|---|---|---|---|
| Smile Dental Center (2 doctors) | Doctor | `01000000001` | Dr. Amal Hassan |
| | Doctor | `01000000002` | Dr. Omar Nabil |
| | Assistant (of Dr. Amal) | `01000000003` | Sara Mostafa |
| | Receptionist (both doctors) | `01000000004` | Rana Adel |
| Nile Family Dental (1 doctor) | Doctor | `01000000011` | Dr. Youssef Kamal |
| | Receptionist | `01000000014` | Mai Hamdy |
| — | Django Admin superuser | `01000000000` | Platform Admin |

`seed_demo` refuses to run unless `DJANGO_DEBUG=true` or `--force` is given,
because it creates accounts with a known password.

## Setting up a real clinic

1. `python manage.py createsuperuser`: you are asked for a phone number, not a username.
2. In **Django Admin** (`/admin/`):
   * **Clinics** → add the clinic.
   * **Users** → add the doctors (role *Doctor*), then assistants and
     receptionists. Assign each of them the doctors they work with (**Assigned
     doctors**); they only see those doctors' patients.
   * **Clinical catalog** → procedures and medications (global, or per clinic).
   * **Payment methods** → *Cash* is already there; add others as needed.
   * **Groups** → *Doctor* / *Assistant* / *Receptionist* hold each role's
     default permissions. Add permissions there (or on a single user) to
     widen access. `manage.py sync_role_permissions --reset` restores the defaults.

## Tests

```bash
cd backend && .venv/bin/pytest                    # backend unit/integration tests
cd qa && ../backend/.venv/bin/pytest              # QA API acceptance tests
cd web && npm run lint && npm run typecheck && npm test
cd qa && npm install && npx playwright test       # Web + PWA end-to-end (starts its own servers)
```

To run the backend tests against PostgreSQL, set
`DATABASE_URL=postgres://user:pass@host:5432/db`. CI runs both databases
(see [.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Production notes

* Backend: set `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL`
  (PostgreSQL), `DJANGO_CSRF_TRUSTED_ORIGINS` and `DJANGO_TIME_ZONE`. Then run
  `manage.py migrate`, `manage.py collectstatic`, and
  `gunicorn config.wsgi` behind HTTPS.
* Web: `npm run build` and serve `web/dist/` as static files. Route `/api/`,
  `/admin/` and `/static/` to Django on the same origin. The service worker
  needs HTTPS.
* Flutter: see [mobile/README.md](mobile/README.md). It is not run in the MVP.
