#!/usr/bin/env bash
# .devcontainer/bootstrap.sh
# Dependency bootstrap. Wired to postCreateCommand.
#
# postCreateCommand runs on first create AND on every "Rebuild Container", so
# this script is built to be cheap on repeat runs: it hashes every manifest that
# can change the dependency graph and skips pnpm entirely when nothing moved.
#
# Rules:
# - The stamp lives inside the persisted node_modules volume, so it survives
#   rebuilds and vanishes exactly when node_modules vanishes.
# - pnpm is already activated in the image. Never run corepack prepare or
#   npm install -g pnpm here; that re-downloads pnpm on every rebuild.
# - Frozen install is the default. If the lockfile is out of sync it self-heals
#   and tells you to commit, rather than leaving a half-built container.

set -euo pipefail

WS=/workspace
STAMP_DIR="$WS/node_modules/.devcontainer"
STAMP="$STAMP_DIR/deps.sha256"

# Paths that must RESOLVE for the workspace to count as installed.
# These are real binaries, not just the node_modules directories: after a
# volume wipe the per-package node_modules survive on the bind mount as
# directories full of DANGLING symlinks into a .pnpm store that no longer
# exists. `test -d` on such a directory passes and would wrongly let the stamp
# short-circuit the install. `test -e` follows symlinks, so a dangling link
# correctly reads as absent. Keep this list in sync with await-deps.sh.
SENTINELS=(
  "$WS/node_modules/.pnpm"
  "$WS/backend/payload-cms/node_modules/cross-env"
  "$WS/backend/nest-api/node_modules/@nestjs/cli"
  "$WS/frontend/node_modules/next"
)

cd "$WS"

log()  { printf '\n\033[1;36m[bootstrap]\033[0m %s\n' "$*"; }
warn() { printf '\n\033[1;33m[bootstrap]\033[0m %s\n' "$*"; }

manifest_hash() {
  {
    sha256sum pnpm-lock.yaml pnpm-workspace.yaml package.json 2>/dev/null || true
    find . -mindepth 2 -maxdepth 3 -name package.json \
      -not -path './node_modules/*' -not -path '*/node_modules/*' \
      -print0 2>/dev/null | sort -z | xargs -0 -r sha256sum
  } | sha256sum | cut -d' ' -f1
}

all_present() {
  local d
  for d in "${SENTINELS[@]}"; do
    [[ -e "$d" ]] || return 1
  done
  return 0
}

CURRENT="$(manifest_hash)"

if [[ -f "$STAMP" ]] && all_present && [[ "$(cat "$STAMP")" == "$CURRENT" ]]; then
  log "manifests unchanged and node_modules intact -> skipping install (no network)"
  exit 0
fi

if all_present; then
  log "manifests changed -> reconciling from the local pnpm store"
else
  log "node_modules missing -> first install for these volumes"
fi

# --prefer-offline: serve everything possible from the persisted pnpm store and
# only reach the registry for tarballs that genuinely are not cached yet.
if pnpm install --frozen-lockfile --prefer-offline; then
  :
else
  warn "frozen install failed - pnpm-lock.yaml is out of sync with the manifests."
  warn "Self-healing with --no-frozen-lockfile. COMMIT the updated pnpm-lock.yaml."
  pnpm install --no-frozen-lockfile --prefer-offline
fi

mkdir -p "$STAMP_DIR"
manifest_hash > "$STAMP"
log "dependencies ready"
