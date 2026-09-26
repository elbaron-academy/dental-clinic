# Sprint 11 — Doctors Add Dental Actions, Patient Chart, Visible Version

Status: QA_PASSED (all suites run on the production VM in a separate workspace, 2026-09-27)

Requested by the product owner on 2026-09-27 (CR-024) after Sprint 10:
"where can I see the version number, where can I look at the teeth, and the
doctor can add an action that is added to the tooth".

## Requirements
- CHART-006: While charting, the doctor adds a new dental action (name,
  color). It is marked on the selected tooth at once and offered to everyone
  in the doctor's clinic. Duplicate names (ignoring case) are refused. Only
  doctors can add actions (`catalog.add_dentalactiontype`).
- CHART-007: The patient page has a "Dental chart" card with the chart of the
  newest charted visit, a visit selector and a link to the visit.
- OPS-002 (extended): the version is shown in the top bar of every page, and
  the PWA checks for a new deploy every 10 minutes and when the app returns
  to the foreground, so a deploy shows up without clearing the cache.

## Tasks
| Task | Agent | Requirements |
|---|---|---|
| S11-BA-01 `business-logic/visits.md`, `docs/DECISIONS.md` (CR-024, permission matrix), `docs/API.md`, traceability | BA | CHART-006, CHART-007 |
| S11-BE-01 `POST /api/catalog/dental-actions/` (clinic-owned, duplicate check, color validation); Doctor role gets `catalog.add_dentalactiontype` | Backend | CHART-006 |
| S11-BE-02 Backend tests (`TestDoctorAddsActionTypes`, permission matrix) | Backend | CHART-006 |
| S11-PWA-01 "+ New action" form in the tooth picker (name, color with a suggested unused color, "Add to tooth N") | PWA | CHART-006 |
| S11-PWA-02 Patient page "Dental chart" card | PWA | CHART-007 |
| S11-PWA-03 Version in the top bar; service worker update checks; version 1.3.0 | PWA | OPS-002 |
| S11-PWA-04 Unit tests `DentalChart.test.tsx`, `VisitPage.test.tsx`, `PatientDetail.test.tsx` | PWA | CHART-006, CHART-007 |
| S11-FL-01 Not in this sprint (Flutter does not show the chart yet) | Flutter | — |
| S11-QA-01 API acceptance `test_dental_chart.py` (doctor adds actions, role check) | QA | CHART-006 |
| S11-QA-02 E2E `dental-chart.spec.ts` (new action, patient chart, top-bar version) | QA | CHART-006, CHART-007, OPS-002 |

## Gate log
| Step | Result | Notes |
|---|---|---|
| Backend → Team Leader | APPROVED | Ruff clean, no migration needed (permission is granted to the Doctor group on `migrate`), 260 tests pass, OpenAPI regenerated. |
| PWA/Web → Team Leader | APPROVED | Lint and typecheck clean, 58 unit tests pass. |
| QA | QA_PASSED | QA API 47 passed, e2e 45 passed (desktop + mobile Chromium), run on the VM in `~/dental-qa`. |
