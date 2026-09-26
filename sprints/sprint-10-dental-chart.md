# Sprint 10 — Dental Chart

Status: QA_PASSED (all suites run on the production VM in a separate workspace, 2026-09-27)

Requested by the product owner on 2026-09-27 (CR-023).

## Requirements
- CHART-001: Dental action types (name, optional code, color) are catalog
  data managed in Django Admin. Seven global defaults are seeded: Caries,
  Filling, Root canal, Crown, Extraction, Implant, Scaling. Inactive types stay
  in history but cannot be selected.
- CHART-002: The doctor handling an active visit selects a tooth (FDI 11–48,
  51–85) and marks or removes actions on it, with optional notes. An action
  type can be marked once per tooth per visit. A marked tooth counts as a
  session outcome for completion.
- CHART-003: Only the owning doctor changes the chart. Staff who can view the
  visit see it read-only; reception does not see it (CR-017). Completed
  visits are locked.
- CHART-004: Each visit has its own chart. Nothing carries over between visits.
- CHART-005: Web/PWA chart: permanent and primary teeth, teeth colored by
  their actions (several actions become color bands), legend, action picker,
  list of marked teeth, phone layout.

## Tasks
| Task | Agent | Requirements |
|---|---|---|
| S10-BA-01 Update `business-logic/visits.md`, `docs/DECISIONS.md` (CR-023, CR-010, permission matrix), `docs/API.md`, traceability | BA | CHART-001..005 |
| S10-BE-01 `catalog.DentalActionType` (color validated as `#RRGGBB`), seeded defaults, admin with color swatch, `GET /api/catalog/dental-actions/` | Backend | CHART-001 |
| S10-BE-02 `visits.VisitToothAction` (unique visit + tooth + action type), `POST/DELETE /api/visits/{id}/tooth-actions/`, `tooth_actions` on `Visit`, admin inline, counts as outcome | Backend | CHART-002, CHART-004 |
| S10-BE-03 Permissions: same rules as procedures (`visits.record_visit` + owner + active; view with `visits.view_visit`) | Backend | CHART-003 |
| S10-BE-04 Backend tests `apps/visits/tests/test_tooth_actions.py` | Backend | CHART-001..004 |
| S10-PWA-01 `DentalChart` component: dentition switch, `Tooth` buttons, action picker, legend, tooth action list; read-only mode | PWA | CHART-002, CHART-003, CHART-005 |
| S10-PWA-02 Chart on the visit page (editor and read-only) and in the visit history (`VisitDetails`); version 1.2.0 | PWA | CHART-002, CHART-005 |
| S10-PWA-03 Unit tests `DentalChart.test.tsx`, `lib/teeth.test.ts`, `VisitPage.test.tsx` | PWA | CHART-001..005 |
| S10-FL-01 Not in this sprint: the Flutter client ignores `tooth_actions` for now | Flutter | — |
| S10-QA-01 API acceptance `qa/api/test_dental_chart.py`: functional, permissions, visit isolation | QA | CHART-001..004 |
| S10-QA-02 E2E `qa/e2e/dental-chart.spec.ts`: marking, colors, removal, primary teeth, completion + history, isolation, read-only, phone layout; `doctor.spec.ts` tooth field locator made exact | QA | CHART-001..005 |

## Delivery
| Layer | Where |
|---|---|
| Business logic | `business-logic/visits.md`, `docs/DECISIONS.md` (CR-023) |
| Backend | `apps/catalog/{models,serializers,views,admin}.py`, `apps/catalog/migrations/0002_dentalactiontype.py`, `apps/visits/{models,serializers,views,admin,services}.py`, `apps/visits/migrations/0002_visittoothaction.py`, `apps/core/urls.py` |
| API contract | `docs/API.md`, `docs/api/openapi.yaml` |
| PWA | `web/src/components/DentalChart.tsx`, `web/src/lib/teeth.ts`, `web/src/components/VisitDetails.tsx`, `web/src/pages/visits/VisitPage.tsx`, `web/src/api/{types,endpoints}.ts`, `web/src/styles.css` |
| Tests | `backend/apps/visits/tests/test_tooth_actions.py`, `web/src/components/DentalChart.test.tsx`, `web/src/lib/teeth.test.ts`, `web/src/pages/visits/VisitPage.test.tsx`, `qa/api/test_dental_chart.py`, `qa/e2e/dental-chart.spec.ts` |

## Gate log
| Step | Result | Notes |
|---|---|---|
| Backend → Team Leader | APPROVED | Ruff clean, migrations match models, 251 backend tests pass, OpenAPI regenerated without warnings. |
| PWA/Web → Team Leader | APPROVED | Lint and typecheck clean, 52 unit tests pass. |
| QA | QA_PASSED | Run on the production VM in `~/dental-qa` (own SQLite database and ports 8001/4174; production untouched): QA API 45 passed, e2e 42 passed (desktop + mobile Chromium). |
