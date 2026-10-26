#!/usr/bin/env bash
# Deploy a TeamMatch release on the sitashma host, rolling back if it isn't healthy.
#
#   teammatch-deploy 1.0.5     deploy v1.0.5
#   teammatch-deploy --check   test the version check and exit
#
# The Actions deploy key is forced to run this script, so there the version
# comes from $SSH_ORIGINAL_COMMAND. Setup: deploy/README.md, One-time setup.
#
# Runs from the copy at ~/bin/teammatch-deploy, never from the submodule it
# checks out (bash reads a script while it runs).
set -euo pipefail
umask 077

INFRA=$HOME/sitashma-infra
APP=$INFRA/apps/teammatch
ENV_FILE=$APP/deploy/.env
BACKUPS=$HOME/backups
REPO_URL=https://github.com/season101/teammatch.git
HEALTH_URL=https://teammatch.sijancodes.com/api/v1/health/
SERVICES=(teammatch-migrate teammatch-api teammatch-web)

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }

valid_version() { [[ $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; }

self_check() {
  local v
  for v in 1.0.4 0.1.0 10.20.30; do
    valid_version "$v" || { echo "FAIL: $v should pass"; return 1; }
  done
  for v in "" 1.0 v1.0.4 1.0.4.1 1.0.x "1.0.4 " " 1.0.4" "1.0.4;id" "\$(id)" -1.0.4 $'1.0.4\nid'; do
    if valid_version "$v"; then echo "FAIL: '$v' should be rejected"; return 1; fi
  done
  echo "version check ok"
}

compose() { (cd "$INFRA" && docker compose --profile apps "$@"); }

set_version() { sed -i "s/^TEAMMATCH_VERSION=.*/TEAMMATCH_VERSION=$1/" "$ENV_FILE"; }

# Health has to say ok and report the wanted version, within about 2 minutes.
wait_healthy() {
  local want=$1 i
  for i in $(seq 24); do
    if curl -fsS --max-time 5 "$HEALTH_URL" 2>/dev/null | python3 -c '
import json, sys
d = json.load(sys.stdin)
sys.exit(0 if d.get("status") == "ok" and d.get("version") == sys.argv[1] else 1)
' "$want" 2>/dev/null; then
      log "healthy on $want"
      return 0
    fi
    log "waiting for health on $want ($i/24)"
    sleep 5
  done
  return 1
}

deploy() {
  git -C "$APP" checkout --quiet "refs/tags/v$version" &&
    set_version "$version" &&
    compose pull "${SERVICES[@]}" &&
    compose up -d "${SERVICES[@]}" &&
    wait_healthy "$version"
}

rollback() {
  log "deploy of $version failed, rolling back to $prev"
  if git -C "$APP" checkout --quiet "$prev_rev" &&
    set_version "$prev" &&
    compose up -d "${SERVICES[@]}" &&
    wait_healthy "$prev"; then
    log "rolled back to $prev"
  else
    log "ROLLBACK FAILED, fix it by hand (deploy/README.md, Roll back)"
  fi
  exit 1
}

version=${1:-${SSH_ORIGINAL_COMMAND:-}}
if [[ $version == --check ]]; then
  self_check
  exit
fi
if ! valid_version "$version"; then
  echo "usage: teammatch-deploy X.Y.Z" >&2
  exit 2
fi

# Keep going if the SSH connection drops, so a cancelled job can't stop a deploy
# halfway; the full output also lands in ~/teammatch-deploy.log.
trap '' HUP
exec > >(tee -p -a "$HOME/teammatch-deploy.log") 2>&1

exec 9>"$HOME/.teammatch-deploy.lock"
if ! flock -n 9; then
  echo "another deploy is running" >&2
  exit 1
fi

prev=$(sed -n 's/^TEAMMATCH_VERSION=\([0-9.]*\).*/\1/p' "$ENV_FILE")
if ! valid_version "$prev"; then
  echo "can't read TEAMMATCH_VERSION from $ENV_FILE, so there's nothing to roll back to" >&2
  exit 1
fi
prev_rev=$(git -C "$APP" rev-parse HEAD)
log "deploying $version (now on $prev)"

backup=$BACKUPS/teammatch-$(date +%F-%H%M%S)-before-$version.dump
log "backing up the database to $backup"
# shellcheck disable=SC2016 # expanded inside the container
if ! docker exec teammatch-db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' >"$backup"; then
  rm -f "$backup"
  echo "backup failed, nothing changed" >&2
  exit 1
fi

# The host's global git config rewrites https to ssh and it has no GitHub key; the repo is public.
log "fetching v$version"
GIT_CONFIG_GLOBAL=/dev/null git -C "$APP" fetch --quiet "$REPO_URL" "refs/tags/v$version:refs/tags/v$version"

deploy || rollback
if ! cmp -s "$0" "$APP/deploy/deploy.sh"; then
  log "note: deploy/deploy.sh changed in this release, copy it to ~/bin/teammatch-deploy again"
fi
log "deployed $version"
