#!/usr/bin/env bash
# Run a Django management command against the deployed backend, as the app
# user and with the production settings from shared/.env.
#
# Usage:
#   sudo backend/deploy/manage.sh [--path PATH] [--name NAME] <command> [args...]
#
# Examples:
#   sudo backend/deploy/manage.sh createsuperuser
#   sudo backend/deploy/manage.sh showmigrations
#   sudo backend/deploy/manage.sh shell

set -euo pipefail

ROOT="/srv/dental-clinic"
NAME="dental-clinic"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --path) ROOT="${2:?--path needs a value}"; shift 2 ;;
    --name) NAME="${2:?--name needs a value}"; shift 2 ;;
    -h|--help) sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) break ;;
  esac
done

[[ $# -gt 0 ]] || { echo "Give a management command, e.g. createsuperuser." >&2; exit 1; }
[[ $EUID -eq 0 ]] || { echo "Run as root (sudo)." >&2; exit 1; }

APP_DIR="$ROOT/backend"
[[ -d "$APP_DIR/current" ]] || { echo "No deployed backend in $APP_DIR." >&2; exit 1; }

cd "$APP_DIR/current"
exec runuser -u "$NAME" -- env HOME="$APP_DIR/.home" \
  bash -c 'set -a; . "$0"; set +a; exec .venv/bin/python manage.py "$@"' "$APP_DIR/shared/.env" "$@"
