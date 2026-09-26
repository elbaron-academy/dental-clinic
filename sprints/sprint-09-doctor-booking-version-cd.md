# Sprint 09 — Doctor Booking, App Version, Continuous Deployment

Status: READY_FOR_QA (verified by CI; QA suites updated but not run in CI)

Requested and approved by the product owner on 2026-09-27.

## Requirements
- ROLE-006 (CR-022): Every doctor can book appointments for their own
  patients. The doctor is selected automatically. Check-in, rescheduling,
  cancelling and billing stay with reception.
- OPS-002: The Web/PWA shows its version and the commit it was built from
  (`v1.1.0 · <commit>`) on the login pages and at the bottom of every page.
- OPS-003: A push to the deploy branch that passes CI is deployed automatically.
- CI runs the backend on SQLite only (no PostgreSQL service) and no QA job.

## Tasks
| Task | Agent | Requirements |
|---|---|---|
| S09-BA-01 Update `business-logic/users-and-roles.md`, `docs/DECISIONS.md` (CR-022, permission matrix), traceability | BA | ROLE-006 |
| S09-BE-01 Grant `appointments.add_appointment` to the Doctor role | Backend | ROLE-006 |
| S09-BE-02 Backend tests: doctor books own patient; not for another doctor or their patient | Backend | ROLE-006 |
| S09-PWA-01 None needed for ROLE-006: "New appointment" follows the permission, the doctor is auto-selected, and walk-in check-in stays hidden without the check-in permission | PWA | ROLE-006 |
| S09-PWA-02 `AppVersion` component; version from `package.json` (1.1.0), commit from the server build | PWA | OPS-002 |
| S09-FL-01 None needed: the Flutter screens follow `appointments.add_appointment` | Flutter | ROLE-006 |
| S09-QA-01 API acceptance: doctor books for own patients only; check-in stays with reception | QA | ROLE-006 |
| S09-QA-02 E2E: doctor registers a patient and books an appointment; doctor permissions spec updated | QA | ROLE-006 |
| S09-OPS-01 CI `deploy` job with a restricted SSH key; `dental-deploy` waits for it | Team Leader | OPS-003 |

## Delivery
| Layer | Where |
|---|---|
| Business logic | `business-logic/users-and-roles.md`, `docs/DECISIONS.md` (CR-022) |
| Backend | `apps/accounts/roles.py` |
| PWA | `web/src/components/AppVersion.tsx`, `Layout.tsx`, `pages/LoginChooser.tsx`, `pages/LoginPage.tsx`, `vite.config.ts`, `web/deploy/deploy.sh` |
| Tests | `backend/apps/accounts/tests/test_permissions.py`, `backend/apps/appointments/tests/test_api.py`, `web/src/components/AppVersion.test.tsx`, `qa/api/test_permissions.py`, `qa/api/test_auth.py`, `qa/e2e/doctor.spec.ts`, `qa/e2e/permissions.spec.ts` |
| CI/CD | `.github/workflows/ci.yml` (`deploy` job), `scripts/ci-deploy-forced-command.sh`, `scripts/deploy-to-server.sh` |

## Gate log
| Step | Result | Notes |
|---|---|---|
| Backend → Team Leader | APPROVED | Permission only. Doctor selection and patient scoping were already enforced by the serializer. |
| PWA/Web → Team Leader | APPROVED | Version comes from the build. No UI change was needed for ROLE-006. |
| QA | Suites updated | Not run in CI for now (product owner, 2026-09-27). |
