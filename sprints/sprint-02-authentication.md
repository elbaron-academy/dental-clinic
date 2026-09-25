# Sprint 02 — Authentication and Roles

Status: DONE (QA_PASSED)

## Requirements
- AUTH-001: Login by phone number + password.
- AUTH-002: Role-aware access.
- AUTH-003: No username login, no "foreign password" flow.
- ROLE-001: Doctor role.
- ROLE-002: Assistant role.
- ROLE-003: Receptionist role.
- ROLE-004: Access scoped to clinic and permitted doctors.
- CLINIC-001: Clinic/doctor setup (one or many doctors) in Django Admin. *(added by BA — was not planned)*

## Tasks
Backend:
- S02-BE-01 Clinic model + Django Admin (CLINIC-001).
- S02-BE-02 Custom user with phone identifier, role, clinic, doctor assignment (AUTH-001, AUTH-003, CR-001).
- S02-BE-03 Login / logout / me API with optional expected-role check and login throttling (AUTH-001, CR-003, CR-019).
- S02-BE-04 Role groups + default permission matrix seeded on migrate (AUTH-002, ROLE-001..003, CR-002).
- S02-BE-05 Clinic + permitted-doctor scoping helpers and `GET /api/doctors/` (ROLE-004).
- S02-BE-06 `seed_demo` (demo clinics) and `sync_role_permissions` commands; real clinics are set up in Django Admin (CLINIC-001).
- S02-BE-07 Automated tests.

PWA/Web:
- S02-PWA-01 Doctor login page.
- S02-PWA-02 Assistant login page.
- S02-PWA-03 Receptionist login page.
- S02-PWA-04 Role-aware routing/UI (role home, permission-guarded routes, logout).

Flutter:
- S02-FL-01 Write corresponding login screens/code only.
- No Flutter execution/testing.

QA:
- S02-QA-01 Automated authentication tests.
- S02-QA-02 Web/PWA login and role-flow testing.

## Delivery
| Layer | Where |
|---|---|
| Backend | `apps/clinics`, `apps/accounts` (User by phone, roles, `roles.py`, `backends.py`, login/logout/me/doctors API, admin), `seed_demo`, `sync_role_permissions` |
| PWA | `web/src/pages/LoginChooser.tsx`, `LoginPage.tsx` (`/login/doctor`, `/login/assistant`, `/login/reception`), `web/src/auth/*`, `components/Layout.tsx` |
| Flutter | `mobile/lib/src/screens/login/*`, `mobile/lib/src/auth/*`, `mobile/lib/src/app.dart` (code only) |
| Tests | `backend/apps/accounts/tests/*`, `qa/api/test_auth.py`, `qa/api/test_permissions.py`, `qa/e2e/auth.spec.ts`, `web/src/pages/LoginPage.test.tsx`, `web/src/auth/guards.test.tsx` |

## Gate log
| Step | Result | Notes |
|---|---|---|
| Backend → Team Leader | APPROVED | Phone is the only identifier; no username field or alternative password flow. Undeclared API actions are denied by default. Login is throttled. |
| PWA/Web → Team Leader | APPROVED | Three role login pages, role homes, pages guarded by permission. |
| Flutter → Team Leader | APPROVED (code review) | Not executed, per skills/flutter. |
| QA | QA_FAILED → QA_PASSED | DEF-001: after logout the user could land on the portal chooser instead of their own login page. Fixed in the PWA and re-tested. |
