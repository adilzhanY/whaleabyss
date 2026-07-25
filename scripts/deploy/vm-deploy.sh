#!/usr/bin/env bash
#
# Production deploy, run ON the VM by .github/workflows/deploy.yml after it has
# already fetched + reset the working tree to origin/main.
#
# This lives in a file, not inline in the workflow, ON PURPOSE. Inline scripts
# run through appleboy/ssh-action, whose error propagation is not obvious: the
# 2026-07-25 deploy of 4b0103b reported SUCCESS in 66s while the build had
# actually failed and left prod serving 500s. Running one script in one bash
# process makes the contract trivial — this file's exit code IS the deploy's
# exit code — and it means the logic can be tested standalone on the VM.
#
# Guarantees:
#   * the running app is never touched until a complete build exists;
#   * a failed build is a no-op, not an outage;
#   * if the new build doesn't serve, the previous one is put back.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/whaleabyss}"
PM2_NAME="${PM2_NAME:-whaleabyss}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000}"
# Checked on purpose: a broken .next still answers dynamic routes while every
# prerendered route 500s, which is how the last breakage looked healthy.
HEALTH_PATHS=("/" "/services")

cd "$APP_DIR"

log() { echo "[deploy] $*"; }

# --- Build out of place ------------------------------------------------------
# `next build` rewrites its output dir as it goes and `next start` reads from
# that same dir at runtime, so building into .next breaks the app that is
# currently serving — for the whole build, on every deploy. NEXT_DIST_DIR is
# read by next.config.ts (distDir).
#
# Side effect: next build rewrites tsconfig.json to add "<distDir>/types" to
# `include`, leaving the tree dirty. Harmless — the workflow's `git reset
# --hard` wipes it at the start of the next deploy.
log "building into .next-build"
rm -rf .next-build
if ! NEXT_DIST_DIR=.next-build npm run build; then
  # The remote DB is occasionally flaky from the VM and the build does DB
  # queries to prerender pages (see DB_RULES.md), so one retry is worth it.
  log "build failed — retrying once"
  rm -rf .next-build
  NEXT_DIST_DIR=.next-build npm run build
fi

# Refuse to ship a build that didn't finish.
if [ ! -f .next-build/BUILD_ID ]; then
  log "ERROR: .next-build/BUILD_ID missing — refusing to swap. Live app untouched."
  exit 1
fi

# --- Swap in the new build ---------------------------------------------------
log "swapping in new build"
rm -rf .next-prev
# Guarded for a first deploy on a fresh VM, where .next won't exist yet.
if [ -d .next ]; then mv .next .next-prev; fi
mv .next-build .next
pm2 restart "$PM2_NAME"

# --- Verify, roll back if the new build doesn't actually serve ---------------
healthy() {
  local p
  for p in "${HEALTH_PATHS[@]}"; do
    curl -fsS -m 10 -o /dev/null "${HEALTH_URL}${p}" || return 1
  done
  return 0
}

ok=""
for _ in $(seq 1 15); do
  sleep 2
  if healthy; then ok="yes"; break; fi
done

if [ -z "$ok" ]; then
  log "ERROR: new build failed its health check"
  if [ -d .next-prev ]; then
    log "rolling back to the previous build"
    rm -rf .next
    mv .next-prev .next
    pm2 restart "$PM2_NAME"
  fi
  exit 1
fi

rm -rf .next-prev
pm2 save
log "deployed $(git rev-parse --short HEAD) OK"
