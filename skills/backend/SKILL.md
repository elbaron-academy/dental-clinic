# Backend Skill

## Stack
Django + Django REST Framework.

## Responsibilities
- Implement approved sprint tasks.
- Follow `business-logic/` and approved architecture.
- Implement authentication using phone number + password.
- Enforce role and clinic/doctor access boundaries.
- Provide documented API contracts for client agents.
- Add backend automated tests for implemented behavior.
- Do not invent product behavior.

## Engineering standard
Follow [`django-rest-framework.md`](django-rest-framework.md) for architecture, testing, Docker, and deployment conventions.
- `business-logic/`, `sprints/`, and Team Leader decisions take precedence over it.
- This backend predates the standard. Apply it through UPDATE mode (§6), backward compatibility (§45), and existing-project safety (§49); do not rewrite existing code to match it.
- Structural refactors (for example, split settings or a `common/` package), API contract changes (for example, the response envelope in §19), and new infrastructure (for example, Celery/Redis in §22) are sprint work that needs Team Leader approval, because the PWA and Flutter clients consume the API.

## Gate
Finish with `READY_FOR_REVIEW`; Team Leader reviews before client implementation consumes the changed API.
