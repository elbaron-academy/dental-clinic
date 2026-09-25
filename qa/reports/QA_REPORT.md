# QA Report — Dental Clinic MVP (Sprint 07 release gate)

| | |
|---|---|
| Agent | QA |
| Scope | Sprints 02–06: authentication, roles, patients, appointments, visits, payments. Web and PWA behaviour. |
| Sources | `business-logic/*.md`, `sprints/sprint-0*.md`, `docs/DECISIONS.md` (TL-approved defaults) |
| Excluded | Flutter runtime testing: disabled for the MVP (`skills/flutter/SKILL.md`, `sprints/sprint-07`) |
| Final status | **QA_PASSED**. All acceptance criteria pass. No open defects. |

## 1. Process

1. Read sprints 02–07 and all of `business-logic/`. Derived acceptance criteria per requirement ID (see `sprints/TRACEABILITY.md`).
2. Wrote the automated tests first:
   * **API acceptance** (`qa/api`): black-box HTTP tests. Only clinic/staff setup, which is Django Admin work, uses the ORM.
   * **Web + PWA end-to-end** (`qa/e2e`): Playwright on a production build of the PWA, against a freshly seeded backend (`qa/scripts/start-backend.sh`).
3. Ran the full regression: backend unit/integration, API acceptance on SQLite and PostgreSQL, Web unit, then e2e on desktop and mobile Chromium.
4. Reported failures to the responsible agent, then re-tested after the Team Leader approved each fix.

## 2. Results (final regression)

| Suite | Command | Result |
|---|---|---|
| Backend lint | `ruff check . && ruff format --check .` | ✅ clean |
| Backend migrations | `makemigrations --check` | ✅ no changes |
| Backend tests, SQLite | `cd backend && pytest` | ✅ **211 passed**, 98 % line coverage of app code |
| Backend tests, PostgreSQL 16 | `DATABASE_URL=postgres://… pytest` | ✅ **211 passed** |
| API contract | `spectacular --validate --fail-on-warn` | ✅ 40 operations, 0 warnings, no drift |
| QA API acceptance, SQLite | `cd qa && pytest` | ✅ **37 passed** |
| QA API acceptance, PostgreSQL 16 | same with `DATABASE_URL` | ✅ **37 passed** |
| Web lint / types | `npm run lint`, `npm run typecheck` | ✅ clean |
| Web unit (Vitest) | `npm test` | ✅ **36 passed** (8 files) |
| Web + PWA e2e (Playwright 1.56, Chromium) | `npx playwright test` | ✅ **36 passed**, 0 flaky (35 desktop, 1 mobile) |
| Flutter | — | ⏭ not executed (by design) |

## 3. Coverage by requirement

✅ means the requirement passed in every listed suite.

| Area | IDs | API acceptance (`qa/api`) | Web/PWA e2e (`qa/e2e`) | Result |
|---|---|---|---|---|
| Login by phone + password | AUTH-001 | `test_auth.py` (all roles, formatted phone) | `auth.spec.ts` (3 role pages, formatted phone, wrong password) | ✅ |
| Role/permission-aware access | AUTH-002 | `test_auth.py::test_role_permissions_are_exposed_for_role_aware_ui`, `test_permissions.py` | `auth.spec.ts` (role homes, guards), `permissions.spec.ts` | ✅ |
| No username / foreign password | AUTH-003 | `test_auth.py::test_there_is_no_username_login`, `::test_there_is_no_foreign_password_flow` | `auth.spec.ts::login form has phone and password only` | ✅ |
| Doctor / Assistant / Receptionist | ROLE-001..003 | `test_permissions.py` | `permissions.spec.ts`, `reception.spec.ts`, `doctor.spec.ts` | ✅ |
| Clinic + permitted-doctor scoping | ROLE-004, PATIENT-004 | `test_permissions.py::test_cross_clinic_isolation`, `::test_assistant_access_follows_assignment`, `::test_other_doctor_cannot_access_patient_or_visit` | `permissions.spec.ts::clinics are isolated`, `doctor.spec.ts::another doctor cannot see…` | ✅ |
| Clinic with one or many doctors | CLINIC-001..003 | `test_patients.py`, `test_lifecycle.py::test_single_doctor_*`, `::test_multi_doctor_*` | `reception.spec.ts` (single-doctor auto-selection, multi-doctor selection) | ✅ |
| Patient registration | PATIENT-001..003 | `test_patients.py` | `reception.spec.ts` (adult, minor + guardian) | ✅ |
| Listing / search | PATIENT-005 | `test_patients.py::test_search_by_name_and_phone` | `reception.spec.ts::searches patients` | ✅ |
| Appointment, check-in, queue | APPT-001..003 | `test_lifecycle.py` | `reception.spec.ts::books, checks in and starts…`, `doctor.spec.ts` (doctor queue) | ✅ |
| Start visit, active-visit protection | APPT-004, APPT-005 | `test_lifecycle.py::test_patient_cannot_be_in_two_active_visits`, `::test_visit_requires_check_in` | `reception.spec.ts::refuses a second active visit` | ✅ |
| Visit ownership | APPT-006 | `test_permissions.py::test_other_doctor_cannot_access_patient_or_visit` | `doctor.spec.ts`, `permissions.spec.ts` | ✅ |
| Notes, diagnosis, tooth/procedure, treatment, medication, follow-up | VISIT-001..006, DX-001, MED-002 | `test_lifecycle.py::test_full_patient_lifecycle` | `doctor.spec.ts::doctor starts a visit…`, `::invalid tooth numbers are rejected` | ✅ |
| Completion, history | VISIT-007/008, LIFE-002/003 | `test_lifecycle.py::test_completed_visit_stays_in_history_and_is_locked`, `test_patients.py::test_new_patient_has_no_history` | `doctor.spec.ts` (completion, outcome required, empty history, history) | ✅ |
| Catalog / payment methods in Django Admin | DX-002, MED-001, PAY-005 | backend tests `catalog/tests/test_admin.py`, `payments/tests/test_admin.py` | — (admin is not part of the PWA) | ✅ |
| Amount due / paid / remaining | PAY-001..003 | `test_payments.py::test_due_paid_and_remaining` | `payments.spec.ts` (partial, overpayment guard, full) | ✅ |
| Payment before / after session | PAY-004 | `test_payments.py::test_payment_before_the_session`, `::test_payment_after_the_session` | `payments.spec.ts` | ✅ |
| Cash as initial method | PAY-006 | `test_payments.py::test_cash_is_the_initial_method` | `payments.spec.ts` (Cash preselected) | ✅ |
| Balance only, no invoicing | PAY-007 | `test_payments.py::test_patient_balance_summary`, `::test_no_invoicing_module` | `payments.spec.ts` (patient balance) | ✅ |
| Full lifecycle | LIFE-001 | `test_lifecycle.py::test_full_patient_lifecycle` | `lifecycle.spec.ts` (reception → doctor → reception across logins) | ✅ |
| PWA | FND-003 | — | `pwa.spec.ts`: manifest and icons, service worker, offline app shell, offline banner, API not cached, phone layout | ✅ |

## 4. Defects

| ID | Sprint / owner | Severity | Found by | Description | Fix | Re-test |
|---|---|---|---|---|---|---|
| DEF-001 | 02 / PWA | Major | `auth.spec.ts::session survives reload and logout ends it`, `lifecycle.spec.ts` | After **Log out**, the user sometimes landed on the portal chooser instead of their own role login page. The logout state change raced with the route guard's redirect. | The auth context remembers the role of the user who signed out, and the guard redirects to that role's login page. New unit test in `web/src/auth/guards.test.tsx`. | ✅ PASS |
| DEF-002 | 05 / Backend (cross-cutting) | Minor (information disclosure) | `doctor.spec.ts::another doctor cannot see…`, `permissions.spec.ts::clinics are isolated` | 404 responses exposed internal model names ("No Patient matches the given query."). | `apps/core/exceptions.py` returns a generic `{"detail": "Not found.", "code": "not_found"}`. | ✅ PASS |
| DEF-003 | 06 / PWA | Minor (accessibility) | `payments.spec.ts` (label lookup was ambiguous) | The billing forms had the same accessible names as their own inputs ("Amount due", "Record payment"). | Removed the redundant form labels. | ✅ PASS |

QA also corrected one issue in its own test code; it was not a product defect. The `loginAs` helper treated `/login/doctor` as if it were the doctor home page `/doctor`, so a login counted as done before it had finished.

## 5. Not tested / risks

* **Flutter**: written and reviewed by the Team Leader, but not executed or tested, by instruction. Run `flutter analyze` and `flutter test` (`mobile/test/models_test.dart` is ready) when the Team Leader enables it.
* **Browsers**: e2e ran on Chromium (desktop and Pixel 7 emulation). Firefox and Safari were not in scope.
* **CR-009**: visit history is strictly limited to permitted doctors. This is the implemented default and awaits a product-owner decision.
* The tests do not cover load, performance or penetration testing.

## 6. Final status

**QA_PASSED.** Every approved acceptance criterion passes, and no blocking or open defects remain. The Sprint 07 exit criteria are met.
