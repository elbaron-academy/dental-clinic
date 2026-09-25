# Sprint 03 — Patient Registration

Status: BACKLOG

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
