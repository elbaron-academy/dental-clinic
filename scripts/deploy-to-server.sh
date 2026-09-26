#!/usr/bin/env bash
# Deploy the pushed commit to the production VM and tell you when it's done.
#
# Nothing is built or run locally: the server pulls from GitHub, then builds
# and deploys the backend and the Web/PWA (see deploy-details.txt).
#
# Usage:
#   scripts/deploy-to-server.sh [--no-ci] [--backend-only | --web-only]
#
#   --no-ci          Don't wait for the GitHub Actions CI run of the commit
#   --backend-only   Deploy only the backend
#   --web-only       Deploy only the Web/PWA
#
# Settings (environment variables):
#   DENTAL_SSH_HOST     SSH host alias           (default: dental)
#   DENTAL_REPO_DIR     Checkout on the server   (default: /srv/dental-clinic/repo)
#   DENTAL_API_DOMAIN   (default: api.dental.hossam-ameen.online)
#   DENTAL_WEB_DOMAIN   (default: dental.hossam-ameen.online)

set -euo pipefail

SSH_HOST="${DENTAL_SSH_HOST:-dental}"
REPO_DIR="${DENTAL_REPO_DIR:-/srv/dental-clinic/repo}"
API_DOMAIN="${DENTAL_API_DOMAIN:-api.dental.hossam-ameen.online}"
WEB_DOMAIN="${DENTAL_WEB_DOMAIN:-dental.hossam-ameen.online}"
WAIT_CI=1
DO_BACKEND=1
DO_WEB=1

for arg in "$@"; do
  case "$arg" in
    --no-ci)        WAIT_CI=0 ;;
    --backend-only) DO_WEB=0 ;;
    --web-only)     DO_BACKEND=0 ;;
    -h|--help)      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)              echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

log() { printf '\033[1;34m==> %s\033[0m\n' "$*"; }

notify() {  # notify STATUS MESSAGE
  local status="$1" msg="$2" urgency=normal
  [[ "$status" == "FAILED" ]] && urgency=critical
  printf '\a'
  if command -v notify-send >/dev/null; then
    notify-send -u "$urgency" "Dental deploy $status" "$msg" || true
  fi
  if [[ "$status" == "FAILED" ]]; then
    printf '\033[1;31m*** DEPLOY FAILED: %s ***\033[0m\n' "$msg" >&2
  else
    printf '\033[1;32m*** DEPLOY FINISHED: %s ***\033[0m\n' "$msg"
  fi
}

fail() { notify FAILED "$*"; exit 1; }

cd "$(dirname "${BASH_SOURCE[0]}")/.."
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
SHA="$(git rev-parse HEAD)"
SHORT="${SHA:0:7}"

# The server deploys what is on GitHub, so the local commit must be pushed.
git fetch --quiet origin "$BRANCH" || fail "could not fetch origin/$BRANCH"
[[ "$(git rev-parse "origin/$BRANCH")" == "$SHA" ]] \
  || fail "$SHORT is not pushed to origin/$BRANCH. Run: git push origin $BRANCH"

if [[ $WAIT_CI -eq 1 ]]; then
  command -v gh >/dev/null || fail "gh CLI is required to wait for CI (or pass --no-ci)"
  log "Waiting for CI on $SHORT"
  run_id=""
  for _ in $(seq 1 30); do
    run_id="$(gh run list --commit "$SHA" --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
    [[ -n "$run_id" ]] && break
    sleep 10
  done
  [[ -n "$run_id" ]] || fail "no CI run found for $SHORT"
  gh run watch "$run_id" --exit-status --interval 30 >/dev/null \
    || fail "CI failed for $SHORT: $(gh run view "$run_id" --json url --jq .url)"
  log "CI passed"
fi

log "Deploying $SHORT ($BRANCH) to $SSH_HOST"
remote="set -euo pipefail
cd '$REPO_DIR'
git fetch --quiet origin
git checkout --quiet '$BRANCH'
git reset --hard --quiet '$SHA'
"
[[ $DO_BACKEND -eq 1 ]] && remote+="sudo backend/deploy/deploy.sh --domain '$API_DOMAIN'
"
[[ $DO_WEB -eq 1 ]] && remote+="sudo web/deploy/deploy.sh --domain '$WEB_DOMAIN' --api-url 'https://$API_DOMAIN'
"
ssh "$SSH_HOST" "bash -c $(printf '%q' "$remote")" || fail "deploy of $SHORT failed on the server (see output above)"

log "Checking the live sites"
[[ $DO_BACKEND -eq 1 ]] && { curl -fsS -o /dev/null "https://$API_DOMAIN/api/health/" || fail "API health check failed"; }
[[ $DO_WEB -eq 1 ]] && { curl -fsS -o /dev/null "https://$WEB_DOMAIN/" || fail "PWA is not reachable"; }

notify OK "$SHORT is live on https://$WEB_DOMAIN and https://$API_DOMAIN"
