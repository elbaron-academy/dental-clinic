# Sprint Planning

Sprints are derived from approved `business-logic/`.

The BA must read all business logic before creating or replanning sprints.

Every requirement must map to at least one sprint task.
Missing requirements must be added to a suitable future sprint.

Suggested lifecycle:
BACKLOG -> IN_PROGRESS -> READY_FOR_REVIEW -> CHANGES_REQUESTED/APPROVED -> READY_FOR_QA -> QA_FAILED/QA_PASSED -> DONE

## Index

| Sprint | Scope | Status |
|---|---|---|
| [01](sprint-01-foundation.md) | Foundation | DONE |
| [02](sprint-02-authentication.md) | Authentication, roles, clinic setup | DONE (QA_PASSED) |
| [03](sprint-03-patients.md) | Patient registration | DONE (QA_PASSED) |
| [04](sprint-04-appointments.md) | Appointments, check-in, queue | DONE (QA_PASSED) |
| [05](sprint-05-visits.md) | Doctor visit, clinical catalog | DONE (QA_PASSED) |
| [06](sprint-06-payments.md) | Payments | DONE (QA_PASSED) |
| [07](sprint-07-qa-release.md) | QA and release gate | DONE |
| [08](sprint-08-doctor-registration-admin-deploy.md) | Doctor registers patients, Doctors admin page, admin theme, production deploy | READY_FOR_QA (CI) |
| [09](sprint-09-doctor-booking-version-cd.md) | Doctor books appointments, app version, continuous deployment | READY_FOR_QA (CI) |
| [10](sprint-10-dental-chart.md) | Dental chart: action types, per-visit tooth actions, chart UI | QA_PASSED (server) |

Requirement IDs and verification: [TRACEABILITY.md](TRACEABILITY.md).
Gaps and approved defaults: [../docs/DECISIONS.md](../docs/DECISIONS.md).
