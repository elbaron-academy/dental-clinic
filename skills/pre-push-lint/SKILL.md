---
name: pre-push-lint
description: Run the same Python lint as CI (ruff check + ruff format --check) on backend/ before every git push. Use before each push that touches Python files.
---

# Pre-push Python lint

CI's "Backend (sqlite) / Lint" job fails the whole pipeline (and blocks deploy)
on any ruff error. Run the exact same checks locally **before every `git push`**
that includes Python changes. This is the only local run allowed besides
reading and editing code (see `AGENTS.md`).

## Steps
1. Use a throwaway venv outside the repo (install ruff only, no Django needed):
   ```bash
   VENV=/tmp/dental-ruff-venv
   [ -x "$VENV/bin/ruff" ] || { python3 -m venv "$VENV" && "$VENV/bin/pip" install -q \
     "$(grep -i '^ruff' backend/requirements-dev.txt)"; }
   ```
2. Run what CI runs (`.github/workflows/ci.yml`, working dir `backend/`):
   ```bash
   cd backend && "$VENV/bin/ruff" check . && "$VENV/bin/ruff" format --check .
   ```
3. On failure: fix with `ruff check --fix .` / `ruff format .`, re-run until clean,
   include the fixes in the commit, and only then push.
4. Never push with failing lint. Report the lint result in the hand-off.

If ruff's version differs from `requirements-dev.txt`, formatting can differ
from CI; always install the pinned version.
