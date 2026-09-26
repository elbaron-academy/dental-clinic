# Sprint 12 — Tooth Images, In-App Dialogs

Status: QA_PASSED (all suites run on the production VM in a separate workspace, 2026-09-27)

Requested by the product owner on 2026-09-27: "instead of a box with the
tooth number, add a tooth image" and "make a modern alert in all the project".

## Requirements
- CHART-005 (extended): each tooth on the chart is drawn as a tooth image
  shaped by its type (incisor, canine, premolar, molar; primary molars as
  molars), roots toward the jaw and the lower jaw mirrored, with the tooth
  number under/over it. The crown takes the action color; several actions
  become color bands.
- UI-001: confirmations use an in-app dialog (title, explanation, clearly
  named buttons, Escape / outside click cancels, focus kept inside) instead of
  the browser's `window.confirm`: completing a visit and cancelling an
  appointment. In-page alerts get an icon and accent border.

## Tasks
| Task | Agent | Requirements |
|---|---|---|
| S12-PWA-01 `ToothImage` SVG in `DentalChart.tsx`; `toothKind`, `isUpper`, `colorBands` in `lib/teeth.ts` | PWA | CHART-005 |
| S12-PWA-02 `components/ConfirmDialog.tsx` + `lib/useConfirm.tsx`; used in `VisitPage.tsx` and `AppointmentDetail.tsx` | PWA | UI-001 |
| S12-PWA-03 Alert, dialog and tooth styles; version 1.4.0 | PWA | CHART-005, UI-001 |
| S12-PWA-04 Unit tests `lib/useConfirm.test.tsx`, `lib/teeth.test.ts`, `DentalChart.test.tsx`, `VisitPage.test.tsx` | PWA | CHART-005, UI-001 |
| S12-QA-01 E2E: `confirmDialog` helper; `doctor`, `lifecycle`, `reception`, `dental-chart` specs updated; new tooth-image/dialog-cancel test | QA | CHART-005, UI-001 |

## Gate log
| Step | Result | Notes |
|---|---|---|
| PWA/Web → Team Leader | APPROVED | Lint and typecheck clean, 62 unit tests pass. Screenshots checked on the VM test build. |
| QA | QA_PASSED | e2e 46 passed (desktop + mobile Chromium), run on the VM in `~/dental-qa`. |
