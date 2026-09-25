# Sprint 07 — QA and Release Gate

Status: DONE (release gate passed)

## QA scope
- Automated tests first.
- Web testing.
- PWA testing.
- Regression.
- Permissions and lifecycle acceptance.

## Tasks
| Task | Agent | Requirements |
|---|---|---|
| S07-QA-01 API acceptance suite derived from business logic (`qa/api`) | QA | all functional IDs |
| S07-QA-02 Web end-to-end suite (`qa/e2e`) on Chromium | QA | AUTH, PATIENT, APPT, VISIT, PAY, LIFE |
| S07-QA-03 PWA checks: manifest, service worker, offline app shell, installability | QA | FND-003 |
| S07-QA-04 Full regression (backend + web unit + API acceptance + e2e) | QA | QA-001 |
| S07-QA-05 QA report with requirement IDs, coverage, results | QA | QA-001 |
| S07-TL-01 Release gate review | Team Leader | all |

## Explicitly excluded
Flutter runtime testing is disabled for the current MVP.

## Exit criteria
All approved acceptance criteria pass and no blocking defects remain.

## Delivery
| Artifact | Where |
|---|---|
| API acceptance suite | `qa/api/` (37 tests, SQLite + PostgreSQL) |
| Web + PWA end-to-end suite | `qa/e2e/` (36 tests: desktop Chromium + mobile Chromium) |
| QA report | [`qa/reports/QA_REPORT.md`](../qa/reports/QA_REPORT.md) |

## Gate log
| Step | Result | Notes |
|---|---|---|
| QA regression | QA_PASSED | Backend 211 · API acceptance 37 · Web unit 36 · E2E 36, all passing. |
| Team Leader release gate | APPROVED | No blocking defects. All approved acceptance criteria pass. Flutter runtime testing stays disabled. Open product question: CR-009. |
