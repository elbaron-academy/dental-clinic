#!/usr/bin/env bash
# The only command the GitHub Actions deploy key may run on the VM.
#
# Installed as /usr/local/sbin/dental-ci-deploy (root-owned copy, so pushing a
# change here does nothing until an admin reinstalls it). The `deploy` user's
# authorized_keys entry forces it:
#   command="sudo /usr/local/sbin/dental-ci-deploy",restrict ssh-ed25519 AAAA… github-actions
#
# The client sends:  deploy <40-char commit sha>
# The commit must be on the deploy branch. The checkout is updated as the repo
# owner, then the backend and the Web/PWA are deployed (see deploy-details.txt).

set -euo pipefail

REPO="/srv/dental-clinic/repo"
REPO_OWNER="hossam"
BRANCH="claude/adoring-goldberg-ye6g4m"
API_DOMAIN="api.dental.hossam-ameen.online"
WEB_DOMAIN="dental.hossam-ameen.online"

read -r action sha extra <<< "${SSH_ORIGINAL_COMMAND:-}"
if [[ "${action:-}" != "deploy" || ! "${sha:-}" =~ ^[0-9a-f]{40}$ || -n "${extra:-}" ]]; then
  echo "usage: deploy <40-character commit sha>" >&2
  exit 2
fi

as_owner() { runuser -u "$REPO_OWNER" -- "$@"; }

as_owner git -C "$REPO" fetch --quiet origin "$BRANCH"
if ! as_owner git -C "$REPO" merge-base --is-ancestor "$sha" "origin/$BRANCH"; then
  echo "Commit $sha is not on origin/$BRANCH." >&2
  exit 3
fi
as_owner git -C "$REPO" checkout --quiet "$BRANCH"
as_owner git -C "$REPO" reset --hard --quiet "$sha"

cd "$REPO"
backend/deploy/deploy.sh --domain "$API_DOMAIN" --root-redirect /admin/
web/deploy/deploy.sh --domain "$WEB_DOMAIN" --api-url "https://$API_DOMAIN"
echo "Deployed ${sha:0:7}"
