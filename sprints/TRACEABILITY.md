# Requirement Traceability Matrix

Owner: Business Analyst · Approved by: Team Leader

Every requirement extracted from `business-logic/` (and the MVP scope in
`docs/PRODUCT_REQUIREMENTS.md`) has a stable ID and maps to at least one sprint
task. Verification columns point to the automated tests that prove the
behaviour. Gaps where the business logic is silent are tracked as change
requests in [`docs/DECISIONS.md`](../docs/DECISIONS.md).

Legend — **BE**: backend tests (`backend/apps/*/tests`), **API-QA**: QA
acceptance tests (`qa/api`), **E2E**: Web/PWA Playwright tests (`qa/e2e`).
Flutter is code-only for the MVP and is never listed as verified.

**Status: every requirement below is implemented in the backend, the Web/PWA
and the Flutter code, and verified by the listed automated tests (QA_PASSED,
see [qa/reports/QA_REPORT.md](../qa/reports/QA_REPORT.md)). Flutter is the one
exception: it is written but, by design, not verified.**

## Clinic

| ID | Requirement | Source | Sprint | Verification |
|---|---|---|---|---|
| CLINIC-001 | Clinic/doctor setup; a clinic may have one or multiple doctors (configured in Django Admin) | clinic.md, PRODUCT_REQUIREMENTS.md | 02 | BE `accounts/tests/test_admin.py`, `accounts/tests/test_models.py::test_clinic_can_have_one_or_many_doctors`, `core/tests/test_seed_demo.py` |
| CLINIC-002 | Single doctor: doctor is selected automatically wherever the workflow needs a doctor | clinic.md | 03, 04 | BE `patients/tests/test_api.py::test_single_permitted_doctor_is_auto_selected`, `appointments/tests/test_api.py::test_doctor_auto_selected_*`; API-QA `test_patients.py`, `test_lifecycle.py`; E2E `reception.spec.ts` (single-doctor clinic) |
| CLINIC-003 | Multiple doctors: user selects a doctor from the doctors they are allowed to manage | clinic.md, appointments.md | 03, 04 | BE `appointments/tests/test_api.py::TestCreate::test_multi_doctor_*`, `patients/tests/test_api.py::TestDoctorAssociation`; API-QA `test_lifecycle.py::test_multi_doctor_clinic_requires_doctor_selection`; E2E `reception.spec.ts` |

## Authentication and roles

| ID | Requirement | Source | Sprint | Verification |
|---|---|---|---|---|
| AUTH-001 | All users log in with phone number + password | authentication.md | 02 | BE `accounts/tests/test_auth_api.py`; API-QA `test_auth.py`; E2E `auth.spec.ts` |
| AUTH-002 | After login, role and permissions determine access | authentication.md | 02 | BE `accounts/tests/test_permissions.py`; API-QA `test_permissions.py`; E2E `auth.spec.ts`, `permissions.spec.ts` |
| AUTH-003 | No username login and no separate "foreign password" flow | authentication.md | 02 | BE `accounts/tests/test_auth_api.py::test_username_field_is_not_accepted`; API-QA `test_auth.py` |
| ROLE-001 | Doctor: accesses assigned patient records and manages clinical visit information | users-and-roles.md | 02, 05 | BE `accounts/tests/test_permissions.py`, `visits/tests/test_api.py`; API-QA `test_permissions.py` |
| ROLE-002 | Assistant: accesses patients/doctors permitted by their assignment | users-and-roles.md | 02, 03 | BE `accounts/tests/test_permissions.py`, `patients/tests/test_api.py`; API-QA `test_permissions.py`; E2E `permissions.spec.ts` |
| ROLE-003 | Receptionist: patient registration, appointments/check-in, queue state and payment recording, according to permissions | users-and-roles.md | 02, 03, 04, 06 | BE `accounts/tests/test_permissions.py`; API-QA `test_permissions.py`; E2E `reception.spec.ts` |
| ROLE-004 | All access is scoped to the user's clinic and permitted doctors | users-and-roles.md, patients.md | 02–06 | BE scoping tests in every app; API-QA `test_permissions.py::test_cross_clinic_*`; E2E `permissions.spec.ts` |
| ROLE-005 | Doctor can register patients; the patient is assigned to that doctor (CR-021) | users-and-roles.md | 08 | BE `accounts/tests/test_permissions.py::test_permission_matrix`, `patients/tests/test_api.py::test_doctor_registers_own_patient`, `::test_doctor_cannot_register_for_another_doctor`; API-QA `test_permissions.py::test_doctor_registers_patient_assigned_to_themself`, `test_auth.py`; E2E `doctor.spec.ts` (doctor registers a patient), `permissions.spec.ts` |

## Patients

| ID | Requirement | Source | Sprint | Verification |
|---|---|---|---|---|
| PATIENT-001 | Registration requires full name and phone number | patients.md | 03 | BE `patients/tests/test_api.py`; API-QA `test_patients.py`; E2E `reception.spec.ts` |
| PATIENT-002 | Address is optional | patients.md | 03 | BE `patients/tests/test_api.py`; API-QA `test_patients.py` |
| PATIENT-003 | A minor requires guardian name and guardian phone | patients.md | 03 | BE `patients/tests/test_api.py`; API-QA `test_patients.py`; E2E `reception.spec.ts` |
| PATIENT-004 | Patient records are associated with the clinic/doctor context and access is scoped to it | patients.md, users-and-roles.md | 03, 04 | BE `patients/tests/test_api.py::TestScopingAndPermissions`; API-QA `test_permissions.py`; E2E `permissions.spec.ts` |
| PATIENT-005 | Patients can be listed and searched (name/phone) within scope | sprint-03 tasks | 03 | BE `patients/tests/test_api.py::TestSearch`; API-QA `test_patients.py::test_search_by_name_and_phone`; E2E `reception.spec.ts` |

## Appointments, check-in and queue

| ID | Requirement | Source | Sprint | Verification |
|---|---|---|---|---|
| APPT-001 | Reception creates/selects an appointment for a patient and doctor | appointments.md | 04 | BE `appointments/tests/test_api.py`; API-QA `test_lifecycle.py`; E2E `reception.spec.ts` |
| APPT-002 | Reception marks the patient as checked in on arrival (patient is then *waiting for doctor*) | appointments.md, patient-lifecycle.md | 04 | BE `appointments/tests/test_api.py::TestCheckInAndCancel`; API-QA `test_lifecycle.py`; E2E `reception.spec.ts` |
| APPT-003 | Doctor queue: checked-in patients wait for their doctor; active visits show who owns them | appointments.md, sprint-04 | 04 | BE `appointments/tests/test_api.py::TestQueueAndListing`; API-QA `test_lifecycle.py`; E2E `reception.spec.ts`, `doctor.spec.ts` |
| APPT-004 | An active visit is started from a checked-in appointment | appointments.md, patient-lifecycle.md | 04 | BE `appointments/tests/test_api.py::TestStartVisit`; API-QA `test_lifecycle.py`; E2E `reception.spec.ts`, `doctor.spec.ts` |
| APPT-005 | A patient already in an active visit cannot be put into another active visit | appointments.md | 04 | BE `appointments/tests/test_api.py::TestStartVisit::test_second_active_visit_*`, `::test_one_active_visit_constraint_in_database`; API-QA `test_lifecycle.py`; E2E `reception.spec.ts` |
| APPT-006 | The active visit belongs to the doctor currently handling the patient | appointments.md | 04, 05 | BE `visits/tests/test_api.py::TestOwnership`; API-QA `test_permissions.py::test_other_doctor_cannot_access_patient_or_visit`; E2E `doctor.spec.ts` |

## Visits, diagnosis, treatment and medications

| ID | Requirement | Source | Sprint | Verification |
|---|---|---|---|---|
| VISIT-001 | Doctor records visit notes/description | visits.md | 05 | BE `visits/tests/test_api.py`; E2E `doctor.spec.ts` |
| VISIT-002 | Doctor records diagnosis | visits.md, diagnosis-and-treatment.md | 05 | BE `visits/tests/test_api.py`; E2E `doctor.spec.ts` |
| VISIT-003 | Doctor records tooth/procedure information | visits.md | 05 | BE `visits/tests/test_api.py::test_add_procedure_*`; E2E `doctor.spec.ts` |
| VISIT-004 | Doctor records treatment | visits.md, diagnosis-and-treatment.md | 05 | BE `visits/tests/test_api.py`; E2E `doctor.spec.ts` |
| VISIT-005 | Doctor records medication where applicable | visits.md, medications.md | 05 | BE `visits/tests/test_api.py::test_add_medication_*`; E2E `doctor.spec.ts` |
| VISIT-006 | Doctor records follow-up visits | visits.md, patient-lifecycle.md | 05 | BE `visits/tests/test_api.py::test_follow_up_*`; API-QA `test_lifecycle.py`; E2E `doctor.spec.ts` |
| VISIT-007 | Doctor completes the visit after recording the session outcome | visits.md | 05 | BE `visits/tests/test_api.py::test_complete_*`; API-QA `test_lifecycle.py`; E2E `doctor.spec.ts` |
| VISIT-008 | Completed visits remain in the patient's visit history | visits.md, patient-lifecycle.md | 05 | BE `visits/tests/test_api.py::test_history_*`; API-QA `test_lifecycle.py`; E2E `doctor.spec.ts` |
| DX-001 | Procedures/treatments reference configured clinical items where applicable | diagnosis-and-treatment.md | 05 | BE `visits/tests/test_api.py::TestRecording::test_add_procedure_*`, `catalog/tests/test_api.py`; E2E `doctor.spec.ts` |
| DX-002 | Clinical catalog is configured through Django Admin | diagnosis-and-treatment.md | 05 | BE `catalog/tests/test_admin.py` |
| MED-001 | Medications are configurable clinical data managed in Django Admin | medications.md | 05 | BE `catalog/tests/test_admin.py`, `catalog/tests/test_api.py` |
| MED-002 | Doctor selects medications and records quantity/duration | medications.md | 05 | BE `visits/tests/test_api.py::test_add_medication_*`; E2E `doctor.spec.ts` |

## Patient lifecycle

| ID | Requirement | Source | Sprint | Verification |
|---|---|---|---|---|
| LIFE-001 | Registered → Appointment → Checked in → Waiting → Active visit → Recorded → Completed → Payment pending/paid → optional follow-up | patient-lifecycle.md | 04, 05, 06 | API-QA `test_lifecycle.py::test_full_patient_lifecycle`; E2E `lifecycle.spec.ts` |
| LIFE-002 | A new patient may have no previous visits/history | patient-lifecycle.md | 03, 05 | BE `visits/tests/test_api.py::test_history_empty_for_new_patient`; E2E `reception.spec.ts` |
| LIFE-003 | Completed visits remain visible in the patient's history | patient-lifecycle.md | 05 | same as VISIT-008 |

## Payments

| ID | Requirement | Source | Sprint | Verification |
|---|---|---|---|---|
| PAY-001 | Record amount due | payments.md | 06 | BE `payments/tests/test_api.py`; API-QA `test_payments.py`; E2E `payments.spec.ts` |
| PAY-002 | Record amount paid | payments.md | 06 | BE `payments/tests/test_api.py`; API-QA `test_payments.py`; E2E `payments.spec.ts` |
| PAY-003 | Remaining amount is calculated | payments.md | 06 | BE `payments/tests/test_api.py`; API-QA `test_payments.py`; E2E `payments.spec.ts` |
| PAY-004 | Payment can be collected before or after the visit/session | payments.md | 06 | BE `payments/tests/test_api.py::TestPayments::test_payment_before_visit`, `::test_payment_after_visit`; API-QA `test_payments.py`; E2E `payments.spec.ts` |
| PAY-005 | Payment methods are configurable through Django Admin | payments.md | 06 | BE `payments/tests/test_admin.py` |
| PAY-006 | Cash is the initial supported method | payments.md | 06 | BE `payments/tests/test_models.py::test_cash_is_seeded` |
| PAY-007 | Basic balance tracking only; no invoicing/accounting module | payments.md, PRODUCT_REQUIREMENTS.md | 06 | BE `payments/tests/test_api.py::test_patient_balance`, `::test_no_invoice_endpoints`; API-QA `test_payments.py::test_no_invoicing_module` |

## Foundation and quality (non-functional)

| ID | Requirement | Source | Sprint | Verification |
|---|---|---|---|---|
| FND-001 | Repository structure and shared documentation | sprint-01 | 01 | `README.md`, `docs/ARCHITECTURE.md` |
| FND-002 | Django + DRF backend | sprint-01, skills/backend | 01 | BE `core/tests/test_health.py` |
| FND-003 | Web/PWA project | sprint-01, skills/pwa | 01 | `web/` build + Vitest; E2E `pwa.spec.ts` |
| FND-004 | Flutter project files (code only, never executed) | sprint-01, skills/flutter | 01 | `mobile/`: Team Leader code review only |
| FND-005 | Database configuration and development conventions | sprint-01 | 01 | `backend/config/settings.py`, CI Postgres job |
| FND-006 | Documented API contract for client agents | skills/backend | 01–06 | `docs/API.md`, `docs/api/openapi.yaml`, BE `core/tests/test_schema.py` |
| QA-001 | Automated tests first, then Web and PWA testing, regression, permissions and lifecycle acceptance | sprint-07, skills/qa | 07 | `qa/reports/QA_REPORT.md` |
| QA-002 | Flutter runtime testing disabled for the MVP | sprint-07, skills/flutter | 07 | Not executed by design |
| ADMIN-001 | Doctors have their own Django Admin page (`accounts.Doctor` proxy) | product owner, 2026-09-26 | 08 | BE `accounts/tests/test_admin.py::test_doctor_page_*`, `::test_admin_pages_load` |
| ADMIN-002 | Django Admin uses the django-jazzmin theme | product owner, 2026-09-26 | 08 | BE `accounts/tests/test_admin.py::test_admin_pages_load` |
| OPS-001 | Deployment to the production VM (nginx, gunicorn/systemd, HTTPS) | product owner, 2026-09-26 | 08 | `DEPLOY_TODO.md`, `deploy-details.txt`; health check in `backend/deploy/deploy.sh` and `web/deploy/deploy.sh` |

## Coverage check

The BA re-read all of `business-logic/` after the plan was written: every
statement in those files maps to at least one ID above. Requirements that were
missing from the original sprint files and have been added:

| Requirement | Was missing from | Added to |
|---|---|---|
| CLINIC-001 clinic/doctor setup | all sprints | Sprint 02 |
| AUTH-003 no username / foreign password | Sprint 02 | Sprint 02 (negative tests) |
| ROLE-004 clinic + doctor scoping | only implicit | Sprints 02–06 |
| DX-001, DX-002, MED-001 catalog in Django Admin | Sprint 05 | Sprint 05 |
| LIFE-001..003 lifecycle | only implicit | Sprints 04–06, accepted in 07 |
| PAY-007 balance only, no invoicing | Sprint 06 | Sprint 06 |
| Flutter + QA tasks for sprints 03–06 | Sprints 03–06 | Sprints 03–06 |
| FND-006 API contract | Sprint 01 | Sprints 01–06 |
