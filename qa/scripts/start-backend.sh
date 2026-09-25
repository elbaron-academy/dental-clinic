#!/usr/bin/env bash
# Starts a throw-away backend for the end-to-end suite: fresh SQLite database,
# demo clinics/staff/catalog (scripts use the demo password), port 8001.
set -euo pipefail
cd "$(dirname "$0")/../../backend"
mkdir -p ../qa/.tmp
DB="$(cd ../qa/.tmp && pwd)/e2e.sqlite3"
rm -f "$DB"
export DJANGO_DEBUG=true
export DJANGO_SECRET_KEY=e2e-only-secret
export DATABASE_URL="sqlite:///$DB"
export LOGIN_THROTTLE_RATE=10000/min
PYTHON=${PYTHON:-.venv/bin/python}
"$PYTHON" manage.py migrate -v0
"$PYTHON" manage.py seed_demo --force >/dev/null
exec "$PYTHON" manage.py runserver 127.0.0.1:8001 --noreload
