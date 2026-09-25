# Sprint 05 — Doctor Visit

Status: DONE (QA_PASSED)

## Requirements
- VISIT-001: Visit notes.
- VISIT-002: Diagnosis.
- VISIT-003: Tooth/procedure information.
- VISIT-004: Treatment.
- VISIT-005 / MED-002: Medication selection with quantity/duration.
- VISIT-007: Visit completion.
- VISIT-008 / LIFE-003: Patient visit history.
- VISIT-006: Follow-up visit creation.
- DX-001 / DX-002 / MED-001: Clinical catalog (procedures, medications) in Django Admin. *(added by BA)*
- APPT-006: Only the owning doctor records/completes the active visit.

## Tasks
| Task | Agent | Requirements |
|---|---|---|
| S05-BE-01 Catalog app: Procedure, Medication (global or per clinic), admin, read API | Backend | DX-001, DX-002, MED-001 |
| S05-BE-02 Visit model, procedures (tooth), medications, admin | Backend | VISIT-001..005 |
| S05-BE-03 Visit API: retrieve/update, procedures, medications, follow-ups, complete, history | Backend | VISIT-001..008, APPT-006 |
| S05-BE-04 Tests | Backend | all |
| S05-PWA-01 Doctor visit screen (record session, follow-up, complete) | PWA | VISIT-001..007 |
| S05-PWA-02 Patient visit history | PWA | VISIT-008, LIFE-002, LIFE-003 |
| S05-FL-01 Equivalent Flutter screens — code only | Flutter | all |
| S05-QA-01 API acceptance + Web visit tests | QA | all |

## Delivery
| Layer | Where |
|---|---|
| Backend | `apps/catalog` (Procedure, Medication, admin, read API), `apps/visits` (models, FDI tooth validator, services, viewset actions, admin) |
| PWA | `web/src/pages/visits/VisitPage.tsx`, `components/VisitDetails.tsx`, visit history in `pages/patients/PatientDetail.tsx` |
| Flutter | `mobile/lib/src/screens/visits/visit_screen.dart`, `widgets/visit_details.dart` (code only) |
| Tests | `backend/apps/visits/tests/*`, `backend/apps/catalog/tests/*`, `qa/api/test_lifecycle.py`, `qa/e2e/doctor.spec.ts`, `web/src/pages/visits/VisitPage.test.tsx` |

## Gate log
| Step | Result | Notes |
|---|---|---|
| Backend → Team Leader | APPROVED | Only the owning doctor records a visit (403 otherwise). A completed visit is read-only (409 `visit_completed`). A visit cannot be completed without an outcome (CR-010). |
| PWA/Web → Team Leader | APPROVED | Unsaved notes are saved automatically before completing the visit. |
| Flutter → Team Leader | APPROVED (code review) | |
| QA | QA_FAILED → QA_PASSED | DEF-002: 404 responses exposed internal model names. The backend now returns a generic "Not found." Re-tested. |
