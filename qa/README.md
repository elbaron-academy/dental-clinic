# QA

Owned by the QA agent ([skills/qa/SKILL.md](../skills/qa/SKILL.md)).
The latest results are in [reports/QA_REPORT.md](reports/QA_REPORT.md).

| Suite | Location | Run |
|---|---|---|
| API acceptance (black-box HTTP, derived from `business-logic/`) | `api/` | `../backend/.venv/bin/pytest` (add `DATABASE_URL=postgres://…` for PostgreSQL) |
| Web + PWA end-to-end (Playwright, Chromium desktop + mobile) | `e2e/` | `npm install && npx playwright test` |

The e2e run starts its own servers:

* `scripts/start-backend.sh` starts the backend on `:8001` with a fresh SQLite
  database seeded by `seed_demo`.
* It builds the PWA and serves it with `vite preview` on `:4174`, proxying
  `/api` to the backend.

Outside CI, servers that are already running are reused. The HTML report is
written to `playwright-report/` (`npm run report`).

Flutter is not tested in the MVP.
