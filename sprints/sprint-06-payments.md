# Sprint 06 — Payments

Status: DONE (QA_PASSED)

## Requirements
- PAY-001: Record amount due.
- PAY-002: Record amount paid.
- PAY-003: Calculate remaining balance.
- PAY-004: Allow payment before/after session.
- PAY-005: Configure payment methods in Django Admin.
- PAY-006: Cash as initial method.
- PAY-007: Basic balance tracking only (no invoicing/accounting). *(added by BA)*
- LIFE-001: Payment pending or paid after the visit.

## Tasks
| Task | Agent | Requirements |
|---|---|---|
| S06-BE-01 PaymentMethod model + admin, Cash data migration | Backend | PAY-005, PAY-006 |
| S06-BE-02 Amount due per appointment, Payment model, rules, status | Backend | PAY-001..004, CR-014..016 |
| S06-BE-03 Payments API, billing on appointments, patient balance | Backend | PAY-001..004, PAY-007 |
| S06-BE-04 Tests | Backend | all |
| S06-PWA-01 Billing panel on appointment (amount due, record payment, history) | PWA | PAY-001..004 |
| S06-PWA-02 Patient balance summary | PWA | PAY-003, PAY-007 |
| S06-FL-01 Equivalent Flutter screens — code only | Flutter | all |
| S06-QA-01 API acceptance + Web payment tests | QA | all |

## Delivery
| Layer | Where |
|---|---|
| Backend | `apps/payments` (PaymentMethod + Cash data migration, Payment, `billing.py`, `services.py`, `balance.py`, API, admin), `Appointment.amount_due` |
| PWA | `web/src/pages/appointments/BillingPanel.tsx`, balance card in `PatientDetail.tsx` |
| Flutter | billing card in `mobile/lib/src/screens/appointments/appointment_detail_screen.dart` (code only) |
| Tests | `backend/apps/payments/tests/*`, `qa/api/test_payments.py`, `qa/e2e/payments.spec.ts` |

## Gate log
| Step | Result | Notes |
|---|---|---|
| Backend → Team Leader | APPROVED | Amount paid is computed with a subquery (no join fan-out). Payments are row-locked, so concurrent payments cannot overpay. |
| PWA/Web → Team Leader | APPROVED | |
| Flutter → Team Leader | APPROVED (code review) | |
| QA | QA_FAILED → QA_PASSED | DEF-003: the billing forms had the same accessible names as their inputs, so controls were announced twice. Fixed and re-tested. |
