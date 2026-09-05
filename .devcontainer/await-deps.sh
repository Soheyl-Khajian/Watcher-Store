#!/usr/bin/env bash
# .devcontainer/await-deps.sh
# Gate for the dev tasks. Blocks until bootstrap.sh has actually finished.
#
# Why this exists:
# VS Code loads the workspace and fires runOn:folderOpen tasks while
# postCreateCommand is STILL RUNNING. On a warm container that is harmless
# because node_modules is already populated. On a cold one (volumes deleted)
# pnpm install needs minutes, so the dev tasks start against an empty or
# half-written node_modules and die with MODULE_NOT_FOUND.
#
# The check is deliberately not "does node_modules exist". The per-package
# node_modules on the bind mount can survive a volume wipe as a directory full
# of DANGLING symlinks into a .pnpm store that no longer exists. `test -e`
# follows symlinks, so a dangling link correctly reads as absent.

set -uo pipefail

WS=/workspace
STAMP="$WS/node_modules/.devcontainer/deps.sha256"
TIMEOUT="${DEPS_WAIT_TIMEOUT:-900}"
INTERVAL=2

# The exact binaries the three dev tasks invoke.
REQUIRED=(
  "$WS/node_modules/.pnpm"
  "$WS/backend/payload-cms/node_modules/cross-env"
  "$WS/backend/nest-api/node_modules/@nestjs/cli"
  "$WS/frontend/node_modules/next"
)

ready() {
  [[ -f "$STAMP" ]] || return 1
  local p
  for p in "${REQUIRED[@]}"; do
    [[ -e "$p" ]] || return 1
  done
  return 0
}

if ready; then
  printf '\033[1;32m[await-deps]\033[0m dependencies ready\n'
  exit 0
fi

printf '\033[1;36m[await-deps]\033[0m waiting for postCreateCommand (bootstrap.sh) to finish installing...\n'
printf '\033[1;36m[await-deps]\033[0m a cold start after deleting volumes can take several minutes\n'

waited=0
while (( waited < TIMEOUT )); do
  sleep "$INTERVAL"
  waited=$(( waited + INTERVAL ))
  if ready; then
    printf '\033[1;32m[await-deps]\033[0m dependencies ready after %ss\n' "$waited"
    exit 0
  fi
  (( waited % 20 == 0 )) && printf '  ... still waiting (%ss)\n' "$waited"
done

printf '\n\033[1;31m[await-deps]\033[0m gave up after %ss.\n' "$TIMEOUT"
printf 'Missing:\n'
for p in "${REQUIRED[@]}"; do
  [[ -e "$p" ]] || printf '  %s\n' "$p"
done
[[ -f "$STAMP" ]] || printf '  %s (bootstrap never completed)\n' "$STAMP"
printf '\nRun it by hand to see the real error:\n  bash .devcontainer/bootstrap.sh\n'
exit 1
