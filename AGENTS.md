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
