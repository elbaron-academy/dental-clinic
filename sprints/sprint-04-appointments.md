# Sprint 04 — Appointments and Check-in

Status: BACKLOG

## Requirements
- APPT-001: Appointment creation.
- CLINIC-003: Doctor selection for multi-doctor clinics.
- CLINIC-002: Automatic doctor selection for single-doctor clinic.
- APPT-002: Patient arrival/check-in.
- APPT-004 / APPT-005: Start active visit; active-visit protection.
- APPT-003 / APPT-006: Doctor queue/ownership state.
- LIFE-001: Lifecycle states Scheduled → Checked in (waiting) → In visit.
- CR-007: Cancellation of scheduled/checked-in appointments.

## Tasks
| Task | Agent | Requirements |
|---|---|---|
| S04-BE-01 Appointment model + status machine, admin | Backend | APPT-001, APPT-002, LIFE-001 |
| S04-BE-02 Appointments API: list/filter, create (doctor auto-select), update, check-in, cancel | Backend | APPT-001, APPT-002, CLINIC-002, CLINIC-003 |
| S04-BE-03 Start visit with one-active-visit-per-patient guard (DB constraint + 409) | Backend | APPT-004, APPT-005, APPT-006 |
| S04-BE-04 Queue endpoint (waiting / in visit per doctor) | Backend | APPT-003 |
| S04-BE-05 Tests | Backend | all |
| S04-PWA-01 Reception dashboard: today, queue, check-in, start visit, cancel | PWA | APPT-001..005 |
| S04-PWA-02 New appointment form with doctor selection/auto-selection | PWA | APPT-001, CLINIC-002, CLINIC-003 |
| S04-PWA-03 Doctor/assistant queue views | PWA | APPT-003 |
| S04-FL-01 Equivalent Flutter screens — code only | Flutter | all |
| S04-QA-01 API acceptance + Web flow tests | QA | all |
