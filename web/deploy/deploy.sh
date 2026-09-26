#!/usr/bin/env bash
# Deploy the Web/PWA from this git checkout.
#
# Each run builds a new release next to the old ones, then switches to it:
#   copy code -> npm ci -> npm run build -> copy dist/ into a release
#   -> install nginx config -> switch `current` symlink -> health check.
# If the health check fails it switches back to the previous release.
#
# Run on the server, from the git checkout, as root:
#   sudo web/deploy/deploy.sh --domain clinic.example.com
#   sudo web/deploy/deploy.sh --domain clinic.example.com --rollback
#
# Options:
#   --domain DOMAIN   Public domain nginx serves the PWA on (required)
#   --path PATH       Install root (default: /srv/dental-clinic)
#   --name NAME       Name for the build user and nginx files (default: dental-clinic)
#   --api-url URL     API origin, only if the backend is on another domain
#                     (default: empty = same origin, recommended)
#   --keep N          How many releases to keep (default: 5)
#   --rollback        Switch back to the previous release
#   -h, --help        Show this help
#
# Layout under PATH/web:
#   releases/<timestamp>/   one built dist/ per deploy
#   current -> releases/…   what nginx serves

set -euo pipefail

DOMAIN=""
ROOT="/srv/dental-clinic"
NAME="dental-clinic"
API_URL=""
KEEP="5"
ROLLBACK=0
NODE_MIN_MAJOR=22

log() { printf '\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)   DOMAIN="${2:?--domain needs a value}"; shift 2 ;;
    --path)     ROOT="${2:?--path needs a value}"; shift 2 ;;
    --name)     NAME="${2:?--name needs a value}"; shift 2 ;;
    --api-url)  API_URL="${2:?--api-url needs a value}"; shift 2 ;;
    --keep)     KEEP="${2:?--keep needs a value}"; shift 2 ;;
    --rollback) ROLLBACK=1; shift ;;
    -h|--help)  usage ;;
    *)          echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done

[[ -n "$DOMAIN" ]] || { echo "--domain is required." >&2; usage 1; }
[[ $EUID -eq 0 ]] || die "Run as root (sudo)."
for cmd in node npm rsync nginx curl git; do
  command -v "$cmd" >/dev/null || die "'$cmd' is not installed. See DEPLOY_TODO.md."
done
node_major="$(node -p 'process.versions.node.split(".")[0]')"
(( node_major >= NODE_MIN_MAJOR )) || die "Node $NODE_MIN_MAJOR+ is required (found $(node -v))."

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$(dirname "$DEPLOY_DIR")"
APP_DIR="$ROOT/web"
RELEASES="$APP_DIR/releases"
CURRENT="$APP_DIR/current"
APP_USER="$NAME"
NGINX_DIR="/etc/nginx/$NAME/$DOMAIN"

# ---------------------------------------------------------------- helpers

run_app() {  # run as the unprivileged build user
  runuser -u "$APP_USER" -- env HOME="$APP_DIR/.home" npm_config_cache="$APP_DIR/.home/npm" "$@"
}

render() {
  sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__NAME__|$NAME|g" -e "s|__APP_DIR__|$APP_DIR|g" "$1"
}

switch_to() {
  ln -sfn "$1" "$CURRENT.tmp"
  mv -Tf "$CURRENT.tmp" "$CURRENT"
}

previous_release() {
  local cur prev=""
  cur="$(readlink -e "$CURRENT" 2>/dev/null || true)"
  for r in $(ls -1d "$RELEASES"/*/ 2>/dev/null | sort); do
    r="${r%/}"
    [[ "$r" == "$cur" ]] && { echo "$prev"; return; }
    prev="$r"
  done
}

# Ask nginx on this host for the app shell and the service worker, following
# the HTTPS redirect once certbot has set it up. Retries because
# `systemctl reload nginx` returns before the new config is live.
healthy() {
  local opts=(-fsS -o /dev/null -L --max-redirs 2
              --resolve "$DOMAIN:80:127.0.0.1" --resolve "$DOMAIN:443:127.0.0.1")
  for _ in $(seq 1 10); do
    if curl "${opts[@]}" "http://$DOMAIN/" 2>/dev/null && curl "${opts[@]}" "http://$DOMAIN/sw.js"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Same server block as backend/deploy/deploy.sh: created once, certbot adds HTTPS.
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

install_nginx_conf() {
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
  healthy || die "Site is unhealthy after rollback."
  log "Rolled back. Now serving $(basename "$prev")"
  exit 0
fi

# ---------------------------------------------------------------- build

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  log "Creating system user $APP_USER"
  useradd --system --home-dir "$APP_DIR/.home" --no-create-home --shell /usr/sbin/nologin "$APP_USER"
fi
mkdir -p "$RELEASES" "$APP_DIR/.home"
chown "$APP_USER:$APP_USER" "$APP_DIR/.home"

STAMP="$(date +%Y%m%d-%H%M%S)"
BUILD="$APP_DIR/.build-$STAMP"
RELEASE="$RELEASES/$STAMP"
trap 'rm -rf "$BUILD"' EXIT

log "Copying source to $BUILD"
mkdir -p "$BUILD"
rsync -a --delete \
  --exclude 'node_modules/' --exclude 'dist/' --exclude 'dev-dist/' \
  --exclude '.env' --exclude '.env.*' --exclude '*.local' \
  "$SRC_DIR/" "$BUILD/"
chown -R "$APP_USER:$APP_USER" "$BUILD"

log "Installing npm packages"
(cd "$BUILD" && run_app npm ci --no-audit --no-fund --loglevel=error)
log "Building (VITE_API_BASE_URL='${API_URL}')"
(cd "$BUILD" && run_app env VITE_API_BASE_URL="$API_URL" npm run build)

[[ -f "$BUILD/dist/index.html" && -f "$BUILD/dist/sw.js" ]] \
  || die "Build output is missing index.html or sw.js."

log "Creating release $RELEASE"
mkdir -p "$RELEASE"
rsync -a "$BUILD/dist/" "$RELEASE/"
git -c safe.directory='*' -C "$SRC_DIR" rev-parse HEAD > "$RELEASE/REVISION" 2>/dev/null || true
chown -R root:root "$RELEASE"
chmod -R u=rwX,go=rX "$RELEASE"

# ---------------------------------------------------------------- nginx

log "Installing nginx config"
ensure_site
tmp="$(mktemp)"
render "$DEPLOY_DIR/nginx-web.conf.template" > "$tmp"
install -D -m 644 "$DEPLOY_DIR/nginx-security-headers.conf" "/etc/nginx/$NAME/security-headers.conf"
install_nginx_conf "$tmp" "$NGINX_DIR/web.conf"
rm -f "$tmp"

# ---------------------------------------------------------------- switch

prev="$(readlink -e "$CURRENT" 2>/dev/null || true)"
log "Switching to new release"
switch_to "$RELEASE"
if ! healthy; then
  if [[ -n "$prev" && -d "$prev" ]]; then
    log "Health check failed; rolling back to $prev"
    switch_to "$prev"
  fi
  die "Deploy failed. Check: sudo tail -n 50 /var/log/nginx/error.log"
fi

# ---------------------------------------------------------------- prune

current_real="$(readlink -f "$CURRENT")"
ls -1d "$RELEASES"/*/ | sort -r | tail -n +"$((KEEP + 1))" | while read -r old; do
  old="${old%/}"
  [[ "$old" == "$current_real" ]] || rm -rf "$old"
done

log "Web/PWA deployed: $STAMP ($(cut -c1-7 "$RELEASE/REVISION" 2>/dev/null || echo 'no git revision'))"
log "Open: https://$DOMAIN/"
