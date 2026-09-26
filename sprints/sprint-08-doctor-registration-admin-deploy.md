# Sprint 08 — Doctor Registration, Admin, Production Deploy

Status: READY_FOR_QA (verified by CI and the production deploy health checks)

Requested and approved by the product owner on 2026-09-26.

## Requirements
- ROLE-005 (CR-021): Every doctor can register patients by default. The patient
  is assigned to the registering doctor. Editing patients and booking
  appointments stay with reception.
- ADMIN-001: Doctors have their own Django Admin page (proxy model `accounts.Doctor`).
  It lists only doctors, and doctors added there always get the Doctor role and a clinic.
- ADMIN-002: Django Admin uses the django-jazzmin theme.
- OPS-001: The backend and the Web/PWA are deployed to the production VM
  (nginx, gunicorn under systemd, Let's Encrypt HTTPS).

## Tasks
| Task | Agent | Requirements |
|---|---|---|
| S08-BA-01 Update `business-logic/users-and-roles.md`, `docs/DECISIONS.md` (CR-021, permission matrix), traceability | BA | ROLE-005 |
| S08-BE-01 Grant `patients.add_patient` to the Doctor role (`roles.py`); synced to existing groups on deploy | Backend | ROLE-005 |
| S08-BE-02 `Doctor` proxy model, migration, `DoctorAdmin` with its own forms | Backend | ADMIN-001 |
| S08-BE-03 django-jazzmin with sidebar order and icons | Backend | ADMIN-002 |
| S08-BE-04 Backend tests (permission matrix, doctor registration, Doctor admin) | Backend | ROLE-005, ADMIN-001 |
| S08-PWA-01 None needed: the "Register patient" action already follows `patients.add_patient`, and the doctor is auto-selected | PWA | ROLE-005 |
| S08-FL-01 None needed: the Flutter screens already follow `patients.add_patient` | Flutter | ROLE-005 |
| S08-QA-01 API acceptance: doctor registers own patient, cannot register for another doctor | QA | ROLE-005 |
| S08-QA-02 E2E: doctor registers a patient from the dashboard; doctor permissions spec updated | QA | ROLE-005 |
| S08-OPS-01 Deploy scripts (`backend/deploy`, `web/deploy`), `DEPLOY_TODO.md`, `deploy-details.txt`, `scripts/deploy-to-server.sh` | Team Leader | OPS-001 |

## Delivery
| Layer | Where |
|---|---|
| Business logic | `business-logic/users-and-roles.md`, `docs/DECISIONS.md` (CR-021) |
| Backend | `apps/accounts/roles.py`, `apps/accounts/models.py` (`Doctor`), `apps/accounts/migrations/0002_doctor.py`, `apps/accounts/admin.py` (`DoctorAdmin`), `config/settings.py` (jazzmin) |
| Tests | `backend/apps/accounts/tests/test_permissions.py`, `test_admin.py`, `backend/apps/patients/tests/test_api.py`, `qa/api/test_permissions.py`, `qa/api/test_auth.py`, `qa/e2e/doctor.spec.ts`, `qa/e2e/permissions.spec.ts` |
| Deploy | `backend/deploy/`, `web/deploy/`, `DEPLOY_TODO.md`, `deploy-details.txt` |

## Run policy
Agents do not run anything locally (see `AGENTS.md`). Tests run in GitHub
Actions CI. The app is built and deployed only on the server.

## Gate log
| Step | Result | Notes |
|---|---|---|
| Backend → Team Leader | APPROVED | Proxy model needs no new table. The role is forced in `Doctor.save()` and the admin forms. |
| PWA/Web → Team Leader | APPROVED | No change needed; permission-driven UI. |
| QA | Pending CI | Backend, API acceptance and e2e suites run in GitHub Actions on push. |
