# Dental Clinic — Flutter client (code only)

This is the Flutter client for the Dental Clinic MVP. It mirrors the Web/PWA
features and uses the approved API contract in [`../docs/API.md`](../docs/API.md).

> **MVP restriction ([skills/flutter/SKILL.md](../skills/flutter/SKILL.md)):**
> this code has been written and reviewed only. It has **not** been run,
> executed on an emulator or device, or tested. Runtime verification waits
> until the Team Leader enables Flutter testing in a future sprint.

## Features

| Sprint | Screens |
|---|---|
| 02 Auth | Portal chooser, Doctor / Assistant / Receptionist login (phone + password), role-aware home, logout, expired-session handling |
| 03 Patients | Search/list, registration with minor + guardian, doctor auto-selection, detail, edit |
| 04 Appointments | Dashboard queue (waiting / in visit / today), new appointment with walk-in check-in, check-in, start visit, reschedule, cancel |
| 05 Visits | Session notes, diagnosis, treatment, tooth/procedures, medications (quantity/duration), follow-ups, complete, visit history |
| 06 Payments | Amount due, record payment (method from the API), payments list, patient balance |

Screens and actions are shown or hidden according to the `permissions` returned
by `/api/auth/me/`, the same way the PWA does it.

## Structure

```
lib/
  main.dart                  providers + app start
  src/app.dart               theme, auth gate (role-aware routing)
  src/config.dart            API_BASE_URL (--dart-define)
  src/api/                   HTTP client (token auth, error mapping) + typed endpoints
  src/auth/                  AuthController (secure token storage), role texts
  src/models/                API models
  src/screens/               login, home, patients, appointments, visits
  src/widgets/               shared widgets (status chips, doctor picker, …)
test/models_test.dart        written for later; not executed in the MVP
```

## When Flutter execution is enabled

```bash
cd mobile
flutter create . --platforms=android,ios --project-name dental_clinic   # generates platform folders
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000             # Android emulator -> host backend
```
