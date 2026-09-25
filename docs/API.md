# API Contract (v1)

Approved by the Team Leader for the PWA/Web and Flutter clients.
The machine-readable contract is [`api/openapi.yaml`](api/openapi.yaml). It is
generated from the code with `manage.py spectacular`, and CI fails if it drifts.
A running backend also serves the schema at `/api/schema/` and a browsable
reference at `/api/docs/`.

## Conventions

| Topic | Rule |
|---|---|
| Base path | `/api/` |
| Auth | `Authorization: Token <token>` from `POST /api/auth/login/` |
| Format | JSON. Timestamps are ISO 8601 with offset (stored in UTC). Money is a decimal **string** (`"350.00"`). |
| Pagination | List endpoints return `{count, next, previous, results}`. The page size is 25; pass `?page_size=` (max 200) and `?page=` to change it. Catalog, payment methods, doctors and queue are not paginated. |
| Validation errors | `400` `{"field": ["message"], ...}` |
| Rule violations | `409` `{"detail": "...", "code": "..."}`, e.g. `active_visit_exists` |
| Auth errors | `401` `{"detail": ..., "code": "not_authenticated"}` · `403` `{"detail": ..., "code": "permission_denied"}` |
| Scoping | Every query is limited to the user's clinic and permitted doctors. Records outside that scope return `404`. |

Clients should drive the UI from `permissions` in `/api/auth/me/` rather than
from the role name, because admins can grant extra permissions (AUTH-002).

## Authentication (Sprint 02)

| Method | Path | Body / query | Response |
|---|---|---|---|
| POST | `/api/auth/login/` | `{phone, password, role?}` | `200 {token, user: Me}`. `400 {detail, code}` with code `invalid_credentials` \| `no_clinic_access` \| `role_mismatch`. `429` when throttled. |
| POST | `/api/auth/logout/` | — | `204` and the token is revoked |
| GET | `/api/auth/me/` | — | `Me` |
| GET | `/api/doctors/` | — | `[{id, full_name}]`, the user's permitted doctors. **If exactly one is returned, clients auto-select it** (CLINIC-002). |

`Me` = `{id, phone, full_name, role: DOCTOR|ASSISTANT|RECEPTIONIST, role_display,
clinic: {id, name, doctor_count}, permissions: ["app.codename", ...],
permitted_doctors: [{id, full_name}]}`

The role-specific login pages send `role`, and an account of another role is
refused with `role_mismatch` (CR-003).

## Patients (Sprint 03)

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/patients/?search=&doctor=&page=` | `patients.view_patient` | `search` matches name or phone |
| POST | `/api/patients/` | `patients.add_patient` | see body below |
| GET | `/api/patients/{id}/` | `patients.view_patient` | |
| PATCH | `/api/patients/{id}/` | `patients.change_patient` | `doctor_ids` only **adds** doctors |
| GET | `/api/patients/{id}/balance/` | `payments.view_payment` | `{amount_due, amount_paid, remaining_amount, appointments_pending, appointments_not_set}` |

Body: `{full_name*, phone*, address?, is_minor?, guardian_name, guardian_phone, doctor_ids?: [id]}`.
When `is_minor` is true, `guardian_name` and `guardian_phone` are required.
`doctor_ids` may be omitted when the user has exactly one permitted doctor.
Response: `Patient` = `{id, full_name, phone, address, is_minor, guardian_name,
guardian_phone, doctors: [{id, full_name}], created_at, updated_at}`.

## Appointments, check-in and queue (Sprint 04)

`Appointment` = `{id, patient: {id, full_name, phone, is_minor}, doctor: {id, full_name},
scheduled_at, status, status_display, notes, follow_up_of, visit_id, billing,
checked_in_at, cancelled_at, created_at}`

`status`: `SCHEDULED` → `CHECKED_IN` ("Waiting for doctor") → `IN_VISIT` →
`COMPLETED`. `SCHEDULED`/`CHECKED_IN` → `CANCELLED`.

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/appointments/` | `appointments.view_appointment` | filters: `status` (comma list), `doctor`, `patient`, `date` (YYYY-MM-DD), `scheduled_from`, `scheduled_to` (ISO, `[from, to)`), `search`, `ordering` |
| POST | `/api/appointments/` | `appointments.add_appointment` | `{patient_id*, scheduled_at*, doctor_id?, notes?}`. `doctor_id` is auto-selected with a single permitted doctor, otherwise `400 {"doctor_id": ["Select a doctor."]}` |
| GET | `/api/appointments/{id}/` | `appointments.view_appointment` | |
| PATCH | `/api/appointments/{id}/` | `appointments.change_appointment` | `{scheduled_at?, notes?, doctor_id?}`. Only while scheduled or waiting, otherwise `409 invalid_status` |
| POST | `/api/appointments/{id}/check-in/` | `appointments.check_in_appointment` | `SCHEDULED` → `CHECKED_IN`, otherwise `409 invalid_status` |
| POST | `/api/appointments/{id}/cancel/` | `appointments.cancel_appointment` | from `SCHEDULED`/`CHECKED_IN` |
| POST | `/api/appointments/{id}/start-visit/` | `visits.start_visit` | `CHECKED_IN` → `IN_VISIT` and creates the visit (`201`, `visit_id` set). `409 active_visit_exists` when the patient is already in an active visit. |
| GET | `/api/appointments/queue/?doctor=` | `appointments.view_appointment` | `{waiting: [Appointment], in_visit: [Appointment]}`, ordered by arrival / visit start |
| POST | `/api/appointments/{id}/amount-due/` | `payments.manage_billing` | `{amount_due}`, see Payments |

## Visits (Sprint 05)

`Visit` = `{id, status: ACTIVE|COMPLETED, status_display, patient, doctor,
appointment, started_at, completed_at, notes, diagnosis, treatment,
procedures: [{id, procedure: {id, name, code}|null, tooth, notes}],
medications: [{id, medication: {id, name, details}, quantity, duration}],
follow_ups: [{id, scheduled_at, notes, status, status_display}], can_edit}`

`can_edit` is true only for the doctor who owns an active visit.
Every write returns the full updated `Visit`. Writes to someone else's visit
return `403`; writes to a completed visit return `409 visit_completed`.

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/visits/?patient=&doctor=&status=` | `visits.view_visit` | patient visit history, newest first |
| GET | `/api/visits/{id}/` | `visits.view_visit` | |
| PATCH | `/api/visits/{id}/` | `visits.record_visit` + owner | `{notes?, diagnosis?, treatment?}` |
| POST | `/api/visits/{id}/procedures/` | `visits.record_visit` + owner | `{procedure_id?, tooth?, notes?}`. Needs a procedure or notes. `tooth` uses FDI notation (11–48, 51–85). |
| DELETE | `/api/visits/{id}/procedures/{entry_id}/` | same | |
| POST | `/api/visits/{id}/medications/` | same | `{medication_id*, quantity*, duration*}` |
| DELETE | `/api/visits/{id}/medications/{entry_id}/` | same | |
| POST | `/api/visits/{id}/follow-ups/` | same | `{scheduled_at* (future), notes?}` creates a `SCHEDULED` appointment with the same doctor |
| POST | `/api/visits/{id}/complete/` | `visits.complete_visit` + owner | `409 outcome_required` if nothing was recorded |
| GET | `/api/catalog/procedures/?search=` | any clinic user | active items for the clinic |
| GET | `/api/catalog/medications/?search=` | any clinic user | active items for the clinic |

## Payments (Sprint 06)

`billing` on `Appointment` (null without `payments.view_payment`) =
`{amount_due|null, amount_paid, remaining_amount|null, payment_status: NOT_SET|PENDING|PAID, payment_status_display}`

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/appointments/{id}/amount-due/` | `payments.manage_billing` | `{amount_due ≥ 0}`. Cannot be below the amount already paid (`400`). Cancelled appointment gives `409 appointment_cancelled`. |
| GET | `/api/payments/?appointment=&patient=` | `payments.view_payment` | |
| POST | `/api/payments/` | `payments.add_payment` | `{appointment_id*, amount* > 0, method_id*, note?}`. `409 amount_due_not_set`; `400 {"amount": [...]}` on overpayment |
| GET | `/api/payment-methods/` | any clinic user | active methods (`Cash` seeded) |

`Payment` = `{id, appointment_id, amount, method: {id, name, code}, note, received_by, received_at}`

## Other

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health/` | public: `{status, database}` |
| GET | `/api/schema/` | OpenAPI 3 |
| GET | `/api/docs/` | ReDoc reference |
| — | `/admin/` | Django Admin: clinics, staff, role permissions, catalog, payment methods |
