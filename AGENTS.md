# Dental Clinic — Agent Operating Rules

This repository is operated by specialized agents under Team Leader control.

## Source of truth
1. `business-logic/` defines product behavior.
2. `sprints/` defines executable work.
3. Agents must not invent business behavior.
4. Changes to business logic require Team Leader approval.

## Agents
- Team Leader: orchestration, reviews, approvals, gates.
- BA: business analysis, requirements, sprint planning, traceability.
- Backend: Django/DRF implementation.
- PWA: web/PWA implementation.
- Flutter: writes Flutter code only; no execution/testing for now.
- QA: automated tests plus Web/PWA testing; Flutter testing disabled.

## Review gates
Backend -> Team Leader -> PWA/Web -> Team Leader -> QA.
Rejected work returns to the responsible agent with comments.

## Run and deploy policy (overrides any skill that says to run things locally)
1. Do not run anything on the local machine: no dev servers, tests, linters,
   type checks, builds, migrations or `manage.py` commands. Only read and edit code.
2. Tests run in GitHub Actions CI (`.github/workflows/ci.yml`) on every push.
   The app is built and run only on the production server.
3. When a change is finished: commit, push, then run `dental-deploy`
   (`scripts/deploy-to-server.sh`). It waits for CI on the pushed commit,
   deploys the backend and the Web/PWA on the server, checks the live sites,
   and notifies when it has finished or failed. Report its result.
4. Server paths, service names and URLs are in `deploy-details.txt`.
   Server setup and operations are in `DEPLOY_TODO.md`.
5. Any change to business behavior updates `business-logic/` (with Team
   Leader / product owner approval), `docs/DECISIONS.md`, the sprint files,
   `sprints/TRACEABILITY.md` and the QA suites (`qa/api`, `qa/e2e`) in the
   same change.
