# Agent Workflow

BA reads Business Logic -> updates Sprint Plan -> Team Leader approves.

Backend implements -> Team Leader reviews -> changes or approval.

Approved Backend/API -> PWA/Web and Flutter implement.

PWA/Web -> Team Leader review -> QA.

Flutter is code-only for the current MVP and is not runtime tested.

QA reads Sprint + Business Logic -> automated tests -> Web/PWA tests -> report.
Failures return to the responsible agent, then Team Leader review, then QA re-test.
