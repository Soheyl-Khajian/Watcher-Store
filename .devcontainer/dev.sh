#!/usr/bin/env bash
# .devcontainer/dev.sh -> the Dev Container's one script.
#
#   bash .devcontainer/dev.sh boot              what the container runs on every start
#   bash .devcontainer/dev.sh status            which apps are running
#   bash .devcontainer/dev.sh logs [app]        follow an app's output (all three without [app])
#   bash .devcontainer/dev.sh restart [app]     restart one app, or all three
#   bash .devcontainer/dev.sh start|stop [app]
#
# Apps: payload-cms (:3000), nest-api (:3001), frontend (:3002).
#
# boot runs in order, so nothing starts before what it needs:
#   1. the database schemas (also on a database volume that already exists)
#   2. pnpm install from the lockfile (a few seconds when nothing changed;
#      a changed lockfile is an error to fix, never rewritten here)
#   3. Payload's migrations (Nest applies its own when it starts)
#   4. the three apps in the background, each with its own log, unless
#      AUTOSTART_SERVERS=0 in .env
#
# It runs only inside the Dev Container; on the host it refuses and exits.

set -euo pipefail

APPS=(payload-cms nest-api frontend)
RUN_DIR=/tmp/watcher-dev

cd "$(dirname "$0")/.."

say() { printf '\033[1;36m[dev]\033[0m %s\n' "$*"; }
fail() {
  printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2
  exit 1
}

in_container() { [[ -f /.dockerenv || -n "${REMOTE_CONTAINERS:-}" ]]; }

command_of() {
  case "$1" in
    payload-cms) echo "pnpm --filter payload-cms dev" ;;
    nest-api) echo "pnpm --filter nest-api start:dev" ;;
    frontend) echo "pnpm --filter frontend dev" ;;
    *) fail "unknown app '$1' (apps: ${APPS[*]})" ;;
  esac
}

port_of() {
  case "$1" in
    payload-cms) echo 3000 ;;
    nest-api) echo 3001 ;;
    frontend) echo 3002 ;;
  esac
}

# The apps named on the command line, or all of them.
apps_from() {
  if [[ $# -eq 0 || "$1" == all ]]; then
    printf '%s\n' "${APPS[@]}"
  else
    command_of "$1" >/dev/null
    echo "$1"
  fi
}

# The app's process id, if it is running. After a container restart an old
# pid file may name an unrelated process, so the process must really be
# this app's pnpm command.
pid_of() {
  local file="$RUN_DIR/$1.pid" pid
  [[ -f "$file" ]] || return 1
  pid=$(cat "$file")
  ps -o args= -p "$pid" 2>/dev/null | grep -q -- "--filter $1" || return 1
  echo "$pid"
}

start_app() {
  local app=$1
  if pid_of "$app" >/dev/null; then
    say "$app is already running (pid $(pid_of "$app"))"
    return
  fi
  mkdir -p "$RUN_DIR"
  # Its own session, so it outlives this script and can be stopped as a
  # group (pnpm, then the dev server under it).
  setsid bash -c "exec $(command_of "$app")" \
    >"$RUN_DIR/$app.log" 2>&1 </dev/null &
  echo $! >"$RUN_DIR/$app.pid"
  say "$app starting on http://localhost:$(port_of "$app") (logs: dev.sh logs $app)"
}

stop_app() {
  local app=$1 pid
  if ! pid=$(pid_of "$app"); then
    rm -f "$RUN_DIR/$app.pid"
    say "$app is not running"
    return
  fi
  kill -TERM -- "-$pid" 2>/dev/null || true
  for _ in {1..20}; do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.5
  done
  kill -KILL -- "-$pid" 2>/dev/null || true
  rm -f "$RUN_DIR/$app.pid"
  say "$app stopped"
}

boot() {
  in_container || fail "boot runs inside the Dev Container only."

  say "database schemas"
  export PGHOST=db PGUSER="${POSTGRES_USER:-postgres}" \
    PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" PGDATABASE="${POSTGRES_DB:-watcher_store}"
  for _ in {1..30}; do
    pg_isready -q && break
    sleep 1
  done
  psql -q -v ON_ERROR_STOP=1 \
    -c 'CREATE SCHEMA IF NOT EXISTS payload_schema' \
    -c 'CREATE SCHEMA IF NOT EXISTS nest_schema'

  say "dependencies (pnpm install --frozen-lockfile)"
  pnpm install --frozen-lockfile --prefer-offline ||
    fail "pnpm install failed. If pnpm-lock.yaml is out of date, run 'pnpm install' yourself and commit the lockfile."

  say "Payload migrations"
  pnpm --filter payload-cms migrate

  if [[ "${AUTOSTART_SERVERS:-1}" == 0 ]]; then
    say "ready. AUTOSTART_SERVERS=0: start the apps with 'bash .devcontainer/dev.sh start'"
    return
  fi
  for app in "${APPS[@]}"; do start_app "$app"; done
  say "ready. The first compile takes a minute; 'bash .devcontainer/dev.sh status' shows progress."
}

status() {
  local app pid url code
  for app in "${APPS[@]}"; do
    url="http://localhost:$(port_of "$app")"
    if pid=$(pid_of "$app"); then
      code=$(curl -s -o /dev/null -m 3 -w '%{http_code}' "$url" || true)
      if [[ "$code" =~ ^[2-4] ]]; then
        printf '  %-12s running   %s (pid %s)\n' "$app" "$url" "$pid"
      else
        printf '  %-12s starting  %s (pid %s, not answering yet)\n' "$app" "$url" "$pid"
      fi
    else
      printf '  %-12s stopped\n' "$app"
    fi
  done
}

logs() {
  local files=()
  for app in $(apps_from "$@"); do files+=("$RUN_DIR/$app.log"); done
  mkdir -p "$RUN_DIR"
  touch "${files[@]}"
  exec tail -n 100 -F "${files[@]}"
}

action="${1:-}"
shift || true
case "$action" in
  boot) boot ;;
  start) for app in $(apps_from "$@"); do start_app "$app"; done ;;
  stop) for app in $(apps_from "$@"); do stop_app "$app"; done ;;
  restart)
    for app in $(apps_from "$@"); do
      stop_app "$app"
      start_app "$app"
    done
    ;;
  status) status ;;
  logs) logs "$@" ;;
  *)
    sed -n '3,9p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
