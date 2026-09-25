# Change Requests and Implementation Decisions

The business logic in `business-logic/` is the source of truth and has **not**
been modified. Where it is silent, the BA raised a change request (CR). The
Team Leader approved each one as a conservative *implementation default* so
the MVP could be delivered. Every CR still needs **product-owner
confirmation**. If the product owner decides differently, the change stays
small and local. The "Where" column shows the code to change (paths are under `backend/`).

Status values: `TL-APPROVED DEFAULT` (implemented, awaiting product owner) ·
`OPEN` (not implemented, needs a decision).

| CR | Topic | Business logic gap | Implemented default | Where | Status |
|---|---|---|---|---|---|
| CR-001 | Staff ↔ doctor assignment | "permitted by their assignment" does not say how assignment works | Assistants and receptionists are explicitly assigned to one or more doctors of their clinic in Django Admin (`User.assigned_doctors`). No assignment means no patient access. A doctor is only "permitted" for themself. | `apps/accounts/models.py` | TL-APPROVED DEFAULT |
| CR-002 | Default permission matrix | "according to permissions" does not list them | Each role is a Django group that gets the default permissions below. Admins can grant extra permissions to a group or a user in Django Admin. See [Permission matrix](#permission-matrix). | `apps/accounts/roles.py` | TL-APPROVED DEFAULT |
| CR-003 | Role-specific login pages | Sprint 02 asks for separate Doctor / Assistant / Receptionist login pages | Every page uses the same phone + password API and sends the expected role. The API refuses a login made through the wrong portal (`code: role_mismatch`), so no token is issued. | `apps/accounts/serializers.py` | TL-APPROVED DEFAULT |
| CR-004 | How a "minor" is identified | No date of birth or age rule is defined | Registration has an explicit **"Patient is a minor"** flag. When it is set, guardian name and guardian phone are required. | `apps/patients/serializers.py` | TL-APPROVED DEFAULT |
| CR-005 | Duplicate patient phones | Not defined | Phone numbers are **not** unique, because family members often share a phone. Search by phone helps reception find existing records. | `apps/patients/models.py` | TL-APPROVED DEFAULT |
| CR-006 | Phone number format | Not defined | Spaces, dashes, dots and brackets are stripped. The result must be 7–15 digits with an optional leading `+`. No country code is assumed. | `apps/core/phone.py` | TL-APPROVED DEFAULT |
| CR-007 | Appointment cancellation | The lifecycle has no cancel step | Reception may cancel a *Scheduled* or *Checked-in* appointment. A cancelled appointment cannot be checked in, started or paid. | `apps/appointments/views.py` | TL-APPROVED DEFAULT |
| CR-008 | Who starts the active visit | "Reception cannot start another active visit", so reception can start one | Reception (queue state) and the doctor (their own queue) can start a visit from a *Checked-in* appointment. The visit belongs to the appointment's doctor. To hand a patient to another doctor, reception changes the appointment's doctor before starting. | `apps/appointments/views.py` | TL-APPROVED DEFAULT |
| CR-009 | Visit-history visibility across doctors | Scoping to "permitted doctors" vs. a shared clinical history | Strict scoping: a user sees only visits handled by doctors they are permitted for. A doctor who shares a patient with another doctor does **not** see that doctor's visits. | `apps/core/scoping.py` | OPEN – needs PO decision (strict default in place) |
| CR-010 | Completing a visit | "completes the visit after recording the session outcome" | Completion needs at least one recorded outcome (notes, diagnosis, treatment or a procedure). Completed visits are read-only. | `apps/visits/services.py` | TL-APPROVED DEFAULT |
| CR-011 | Tooth notation | Not defined | Optional FDI two-digit notation: permanent 11–48, primary 51–85. | `apps/visits/validators.py` | TL-APPROVED DEFAULT |
| CR-012 | Medication details | "required quantity/duration information" | Each prescribed medication needs a catalog medication plus free-text **quantity** and **duration**. Both are required. | `apps/visits/serializers.py` | TL-APPROVED DEFAULT |
| CR-013 | Follow-up visits | Mechanism not defined | While the visit is active, the owning doctor records a follow-up. This creates a *Scheduled* appointment with the same doctor, linked to the originating visit. Reception can also book ordinary appointments at any time. | `apps/visits/views.py` | TL-APPROVED DEFAULT |
| CR-014 | What a payment belongs to | Payment can happen "before or after a visit/session" | Amount due and payments are recorded per **appointment**, which exists both before and after the session. The patient balance adds up all non-cancelled appointments. | `apps/payments/` | TL-APPROVED DEFAULT |
| CR-015 | Payment rules | Not defined | Amount due must be set before payments are recorded. Every payment is > 0. Overpayment is not allowed. Amount due cannot drop below the amount already paid. There are no refunds or voids in the MVP; corrections go through Django Admin. | `apps/payments/services.py` | TL-APPROVED DEFAULT |
| CR-016 | Payment status | Lifecycle says "Payment Pending or Paid" | `NOT_SET` (no amount due yet), `PENDING` (remaining > 0), `PAID` (remaining = 0). | `apps/payments/billing.py` | TL-APPROVED DEFAULT |
| CR-017 | Receptionist access to clinical content | Receptionist duties are non-clinical | By default a receptionist sees queue status but not diagnosis, treatment or medications. An admin can grant `visits.view_visit`. | `apps/accounts/roles.py` | TL-APPROVED DEFAULT |
| CR-018 | Catalog scope | Not defined | Procedures and medications are either global (no clinic) or specific to one clinic. | `apps/catalog/models.py` | TL-APPROVED DEFAULT |
| CR-019 | API session model | Not defined | DRF token authentication. The token lasts until logout. Login is rate-limited (default 10/min per client). | `config/settings.py` | TL-APPROVED DEFAULT |
| CR-020 | Time zone for "today" | Not defined | Timestamps are stored in UTC. Clients send their local day as `scheduled_from`/`scheduled_to`, and the server `TIME_ZONE` is configurable. | `apps/appointments/filters.py` | TL-APPROVED DEFAULT |

## Permission matrix

These are the default permissions from CR-002, seeded into the role groups on
every `migrate`. Row-level rules also apply on top of these permissions: clinic
and permitted-doctor scoping, and ownership of the active visit.

| Capability | Permission codename | Doctor | Assistant | Receptionist |
|---|---|:-:|:-:|:-:|
| View patients | `patients.view_patient` | ✓ | ✓ | ✓ |
| Register patient | `patients.add_patient` | | | ✓ |
| Edit patient | `patients.change_patient` | | | ✓ |
| View appointments / queue | `appointments.view_appointment` | ✓ | ✓ | ✓ |
| Create appointment | `appointments.add_appointment` | | | ✓ |
| Edit / reschedule appointment | `appointments.change_appointment` | | | ✓ |
| Check patient in | `appointments.check_in_appointment` | | | ✓ |
| Cancel appointment | `appointments.cancel_appointment` | | | ✓ |
| Start active visit | `visits.start_visit` | ✓ | | ✓ |
| View visit history (clinical) | `visits.view_visit` | ✓ | ✓ | |
| Record clinical session (owner only) | `visits.record_visit` | ✓ | | |
| Complete visit (owner only) | `visits.complete_visit` | ✓ | | |
| View billing / payments | `payments.view_payment` | | | ✓ |
| Set amount due | `payments.manage_billing` | | | ✓ |
| Record payment | `payments.add_payment` | | | ✓ |

## Explicitly out of scope (MVP)

* Invoicing and accounting (payments.md, PRODUCT_REQUIREMENTS.md).
* Flutter runtime execution and testing (skills/flutter, sprint-07).
* Username login and any "foreign password" flow (authentication.md).
