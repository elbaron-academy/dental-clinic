#!/usr/bin/env bash
# Deploy the Django backend from this git checkout.
#
# Each run builds a new release next to the old ones, then switches to it:
#   copy code -> virtualenv + requirements -> collectstatic -> check --deploy
#   -> migrate -> switch `current` symlink -> restart systemd -> health check.
# If the health check fails it switches back to the previous release.
# Database migrations are NOT reversed on rollback, so keep them backward compatible.
#
# Run on the server, from the git checkout, as root:
#   sudo backend/deploy/deploy.sh --domain clinic.example.com
#   sudo backend/deploy/deploy.sh --domain clinic.example.com --rollback
#
# Options:
#   --domain DOMAIN   Public domain nginx serves the API on (required)
#   --path PATH       Install root, outside /home (default: /srv/dental-clinic)
#   --name NAME       Name for the system user, service and nginx files (default: dental-clinic)
#   --port PORT       Local port gunicorn listens on (default: 8000)
#   --keep N          How many releases to keep (default: 5)
#   --rollback        Switch back to the previous release and restart
#   -h, --help        Show this help
#
# Layout under PATH/backend:
#   releases/<timestamp>/   one directory per deploy (code + .venv + staticfiles)
#   current -> releases/…   what systemd and nginx serve
#   shared/.env             settings and secrets, kept across releases

set -euo pipefail

DOMAIN=""
ROOT="/srv/dental-clinic"
NAME="dental-clinic"
PORT="8000"
KEEP="5"
ROLLBACK=0

log() { printf '\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)   DOMAIN="${2:?--domain needs a value}"; shift 2 ;;
    --path)     ROOT="${2:?--path needs a value}"; shift 2 ;;
    --name)     NAME="${2:?--name needs a value}"; shift 2 ;;
    --port)     PORT="${2:?--port needs a value}"; shift 2 ;;
    --keep)     KEEP="${2:?--keep needs a value}"; shift 2 ;;
    --rollback) ROLLBACK=1; shift ;;
    -h|--help)  usage ;;
    *)          echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done

[[ -n "$DOMAIN" ]] || { echo "--domain is required." >&2; usage 1; }
[[ $EUID -eq 0 ]] || die "Run as root (sudo)."
for cmd in python3 rsync nginx curl systemctl git; do
  command -v "$cmd" >/dev/null || die "'$cmd' is not installed. See DEPLOY_TODO.md."
done

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$(dirname "$DEPLOY_DIR")"
APP_DIR="$ROOT/backend"
RELEASES="$APP_DIR/releases"
SHARED="$APP_DIR/shared"
CURRENT="$APP_DIR/current"
APP_USER="$NAME"
SERVICE="$NAME-backend"
NGINX_DIR="/etc/nginx/$NAME/$DOMAIN"

# ---------------------------------------------------------------- helpers

# Run a command as the unprivileged app user with the backend settings loaded.
run_app() {
  runuser -u "$APP_USER" -- env HOME="$APP_DIR/.home" PIP_CACHE_DIR="$APP_DIR/.home/pip" \
    bash -c 'set -a; . "$0"; set +a; exec "$@"' "$SHARED/.env" "$@"
}

render() {  # render TEMPLATE > DEST, replacing __KEY__ placeholders
  sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__NAME__|$NAME|g" -e "s|__USER__|$APP_USER|g" \
      -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__PORT__|$PORT|g" "$1"
}

switch_to() {  # atomically point `current` at a release
  ln -sfn "$1" "$CURRENT.tmp"
  mv -Tf "$CURRENT.tmp" "$CURRENT"
}

previous_release() {  # the release just before `current`, if any
  local cur prev=""
  cur="$(readlink -e "$CURRENT" 2>/dev/null || true)"
  for r in $(ls -1d "$RELEASES"/*/ 2>/dev/null | sort); do
    r="${r%/}"
    [[ "$r" == "$cur" ]] && { echo "$prev"; return; }
    prev="$r"
  done
}

healthy() {
  for _ in $(seq 1 20); do
    if curl -fsS -o /dev/null -H "Host: $DOMAIN" "http://127.0.0.1:$PORT/api/health/"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

restart_and_check() {
  systemctl restart "$SERVICE"
  healthy
}

# Create the shared nginx server block for this domain once. certbot later adds
# HTTPS to it, so it is never overwritten. Each app drops its locations into
# /etc/nginx/NAME/DOMAIN/*.conf, which this block includes.
ensure_site() {
  local site="/etc/nginx/sites-available/$DOMAIN.conf"
  mkdir -p "$NGINX_DIR"
  if [[ ! -f "$site" ]]; then
    log "Creating nginx site $site"
    cat > "$site" <<EOF
# Created by the $NAME deploy scripts. certbot adds HTTPS to this file.
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    server_tokens off;
    client_max_body_size 10m;
    gzip on;
    gzip_vary on;
    gzip_types text/css application/javascript application/json image/svg+xml application/manifest+json;

    include $NGINX_DIR/*.conf;
}
EOF
  fi
  ln -sfn "$site" "/etc/nginx/sites-enabled/$DOMAIN.conf"
}

install_nginx_conf() {  # install_nginx_conf RENDERED_FILE DEST (restores the old one if nginx -t fails)
  local src="$1" dest="$2"
  [[ -f "$dest" ]] && cp -a "$dest" "$dest.bak"
  install -m 644 "$src" "$dest"
  if ! nginx -t 2>/dev/null; then
    nginx -t || true
    if [[ -f "$dest.bak" ]]; then mv -f "$dest.bak" "$dest"; else rm -f "$dest"; fi
    die "nginx config test failed; previous config restored."
  fi
  rm -f "$dest.bak"
  systemctl reload nginx
}

# ---------------------------------------------------------------- rollback

if [[ $ROLLBACK -eq 1 ]]; then
  prev="$(previous_release)"
  [[ -n "$prev" ]] || die "No previous release to roll back to."
  log "Rolling back to $prev"
  switch_to "$prev"
  restart_and_check || die "Service is unhealthy after rollback. Check: journalctl -u $SERVICE -n 100"
  log "Rolled back. Now serving $(basename "$prev")"
  exit 0
fi

# ---------------------------------------------------------------- setup

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  log "Creating system user $APP_USER"
  useradd --system --home-dir "$APP_DIR/.home" --no-create-home --shell /usr/sbin/nologin "$APP_USER"
fi

mkdir -p "$RELEASES" "$SHARED" "$APP_DIR/.home"
chown "$APP_USER:$APP_USER" "$SHARED" "$APP_DIR/.home"
chmod 750 "$SHARED"

if [[ ! -f "$SHARED/.env" ]]; then
  log "Creating $SHARED/.env"
  secret="$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')"
  render "$DEPLOY_DIR/env.template" | sed "s|__SECRET__|$secret|" > "$SHARED/.env"
  chown "$APP_USER:$APP_USER" "$SHARED/.env"
  chmod 600 "$SHARED/.env"
  die "Edit $SHARED/.env (set the DATABASE_URL password), then run this script again."
fi
grep -q 'CHANGE_ME' "$SHARED/.env" && die "Replace CHANGE_ME in $SHARED/.env first."

# ---------------------------------------------------------------- build release

RELEASE="$RELEASES/$(date +%Y%m%d-%H%M%S)"
log "Building release $RELEASE"
mkdir -p "$RELEASE"
rsync -a --delete \
  --exclude '.venv/' --exclude '__pycache__/' --exclude '*.sqlite3' \
  --exclude 'staticfiles/' --exclude 'media/' --exclude '.env' \
  --exclude '.pytest_cache/' --exclude '.ruff_cache/' \
  "$SRC_DIR/" "$RELEASE/"
git -c safe.directory='*' -C "$SRC_DIR" rev-parse HEAD > "$RELEASE/REVISION" 2>/dev/null || true

# Build as the app user; afterwards the code becomes root-owned and read-only to the service.
chown -R "$APP_USER:$APP_USER" "$RELEASE"
cleanup_failed() { log "Build failed; removing $RELEASE"; rm -rf "$RELEASE"; }
trap cleanup_failed ERR

log "Installing Python dependencies"
run_app python3 -m venv "$RELEASE/.venv"
run_app "$RELEASE/.venv/bin/pip" install --quiet --upgrade pip
run_app "$RELEASE/.venv/bin/pip" install --quiet -r "$RELEASE/requirements.txt"

cd "$RELEASE"
log "Collecting static files"
run_app .venv/bin/python manage.py collectstatic --noinput --verbosity 0
log "Running Django deploy checks"
run_app .venv/bin/python manage.py check --deploy

chown -R root:root "$RELEASE"
chmod -R go-w "$RELEASE"

log "Applying migrations"
run_app .venv/bin/python manage.py migrate --noinput
run_app .venv/bin/python manage.py sync_role_permissions
trap - ERR

# ---------------------------------------------------------------- systemd + nginx

log "Installing systemd service $SERVICE"
render "$DEPLOY_DIR/backend.service.template" > "/etc/systemd/system/$SERVICE.service"
systemctl daemon-reload
systemctl enable --quiet "$SERVICE"

log "Installing nginx config"
ensure_site
tmp="$(mktemp)"
render "$DEPLOY_DIR/nginx-backend.conf.template" > "$tmp"
install_nginx_conf "$tmp" "$NGINX_DIR/backend.conf"
rm -f "$tmp"

# ---------------------------------------------------------------- switch

prev="$(readlink -e "$CURRENT" 2>/dev/null || true)"
log "Switching to new release"
switch_to "$RELEASE"
if ! restart_and_check; then
  journalctl -u "$SERVICE" -n 30 --no-pager || true
  if [[ -n "$prev" && -d "$prev" ]]; then
    log "Health check failed; rolling back to $prev"
    switch_to "$prev"
    systemctl restart "$SERVICE"
  fi
  die "Deploy failed. Check: journalctl -u $SERVICE -n 100"
fi

# ---------------------------------------------------------------- prune

current_real="$(readlink -f "$CURRENT")"
ls -1d "$RELEASES"/*/ | sort -r | tail -n +"$((KEEP + 1))" | while read -r old; do
  old="${old%/}"
  [[ "$old" == "$current_real" ]] || rm -rf "$old"
done

log "Backend deployed: $(basename "$RELEASE") ($(cut -c1-7 "$RELEASE/REVISION" 2>/dev/null || echo 'no git revision'))"
log "Health: http://$DOMAIN/api/health/   Logs: journalctl -u $SERVICE -f"
