# Sprint 03 — Patient Registration

Status: DONE (QA_PASSED)

## Requirements
- PATIENT-001: Patient name + phone.
- PATIENT-002: Optional address.
- PATIENT-003: Minor guardian information.
- PATIENT-004: Clinic/doctor access scoping.
- PATIENT-005: Listing and search within scope.
- CLINIC-002 / CLINIC-003: Doctor auto-selected for a single doctor, chosen from permitted doctors otherwise.
- LIFE-002: A new patient may have no history.

## Tasks
Implement registration, listing, permissions, and tests across approved clients.

| Task | Agent | Requirements |
|---|---|---|
| S03-BE-01 Patient model (clinic, doctors, minor/guardian), validation, admin | Backend | PATIENT-001..004 |
| S03-BE-02 Patients API: list/search, create, retrieve, update; scoping | Backend | PATIENT-004, PATIENT-005, ROLE-004 |
| S03-BE-03 Tests | Backend | all |
| S03-PWA-01 Patient list + search, registration form (minor toggle), detail, edit | PWA | PATIENT-001..005 |
| S03-FL-01 Patient list, registration and detail screens — code only | Flutter | PATIENT-001..005 |
| S03-QA-01 API acceptance + Web registration tests | QA | all |

## Delivery
| Layer | Where |
|---|---|
| Backend | `apps/patients` (model with DB constraint for minors, serializer rules, scoped viewset, admin), `apps/core/scoping.py` |
| PWA | `web/src/pages/patients/*` (list/search, register/edit with minor toggle, detail) |
| Flutter | `mobile/lib/src/screens/patients/*` (code only) |
| Tests | `backend/apps/patients/tests/*`, `qa/api/test_patients.py`, `qa/e2e/reception.spec.ts`, `web/src/pages/patients/PatientForm.test.tsx` |

## Gate log
| Step | Result | Notes |
|---|---|---|
| Backend → Team Leader | APPROVED | Scoping uses an `EXISTS` subquery, so pagination has no duplicates. `doctor_ids` only ever adds doctors. |
| PWA/Web → Team Leader | APPROVED | Client checks mirror PATIENT-001/003, and API field errors are shown inline. |
| Flutter → Team Leader | APPROVED (code review) | |
| QA | QA_PASSED | |
