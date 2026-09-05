#!/usr/bin/env bash
# .devcontainer/start.sh
# Wired to postStartCommand: runs on create AND on every reopen/start.
#
# Rules:
# - Must be fast and fully offline. No installs here.
# - Must not block. Dev Containers waits for postStartCommand to exit, so
#   long-lived servers are launched detached; otherwise the container appears
#   to hang on "Finalizing" forever.
# - Migrations are idempotent; Payload skips ones already applied.
# - Set AUTOSTART_SERVERS=0 in ../.env to attach without booting the services.

set -euo pipefail

WS=/workspace
cd "$WS"

log() { printf '\n\033[1;36m[start]\033[0m %s\n' "$*"; }

if [[ ! -d node_modules/.pnpm ]]; then
  log "dependencies not installed yet; skipping. Run: bash .devcontainer/bootstrap.sh"
  exit 0
fi

log "applying Payload migrations"
pnpm --filter payload-cms run migrate

if [[ "${AUTOSTART_SERVERS:-1}" != "1" ]]; then
  log "AUTOSTART_SERVERS=0 -> not booting services. Start them with: pnpm run start:all"
  exit 0
fi

mkdir -p /tmp/watcher-logs
log "booting payload-cms, nest-api and frontend in the background"
nohup pnpm run start:all > /tmp/watcher-logs/start-all.log 2>&1 &
disown || true
log "logs: tail -f /tmp/watcher-logs/start-all.log"
