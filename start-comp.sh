#!/usr/bin/env bash
#
# start-comp.sh — start the local Comp AI demo stack.
#
#   ./start-comp.sh          start everything
#   ./start-comp.sh stop     stop everything
#
# Postgres runs as a Homebrew service and restarts at login, so normally
# you only need this for the three app servers.

set -uo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/opt/postgresql@17/bin:/opt/homebrew/bin:$PATH"

LOGDIR="${TMPDIR:-/tmp}/comp-logs"
mkdir -p "$LOGDIR"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }

stop_all() {
  bold "Stopping Comp servers"
  pkill -f "nest start --watch"           2>/dev/null && ok "api"    || warn "api not running"
  pkill -f "next dev --turbo -p 3000"     2>/dev/null && ok "app"    || warn "app not running"
  pkill -f "next dev --turbopack -p 3002" 2>/dev/null && ok "portal" || warn "portal not running"
  echo "Postgres and MinIO left running."
  echo "  (brew services stop postgresql@17 / brew services stop minio)"
}

if [ "${1:-start}" = "stop" ]; then stop_all; exit 0; fi

bold "1. Postgres"
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  brew services start postgresql@17 >/dev/null 2>&1
  printf '  waiting'
  for _ in $(seq 1 30); do
    pg_isready -h localhost -p 5432 >/dev/null 2>&1 && break
    printf '.'; sleep 1
  done
  echo
fi
pg_isready -h localhost -p 5432 >/dev/null 2>&1 && ok "postgres ready" || { warn "postgres did NOT come up"; exit 1; }

bold ""
bold "2. MinIO (S3)"
if ! curl -s -o /dev/null --max-time 3 http://localhost:9000/minio/health/live; then
  brew services start minio >/dev/null 2>&1
  printf '  waiting'
  for _ in $(seq 1 30); do
    curl -s -o /dev/null --max-time 2 http://localhost:9000/minio/health/live && break
    printf '.'; sleep 1
  done
  echo
fi
curl -s -o /dev/null --max-time 3 http://localhost:9000/minio/health/live \
  && ok "minio ready on :9000" \
  || warn "minio did NOT come up — file uploads will fail"

bold ""
bold "3. Starting servers"

# The API must be up first — it's the auth source for both frontends.
if lsof -nP -iTCP:3333 -sTCP:LISTEN >/dev/null 2>&1; then
  ok "api already on :3333"
else
  ( cd apps/api && bun run dev:no-trigger > "$LOGDIR/api.log" 2>&1 & )
  printf '  waiting for api'
  for _ in $(seq 1 90); do
    grep -qa "Nest application successfully started" "$LOGDIR/api.log" 2>/dev/null && break
    grep -qa "ExceptionHandler" "$LOGDIR/api.log" 2>/dev/null && { echo; warn "api failed — see $LOGDIR/api.log"; break; }
    printf '.'; sleep 1
  done
  echo
  lsof -nP -iTCP:3333 -sTCP:LISTEN >/dev/null 2>&1 && ok "api on :3333" || warn "api not listening — see $LOGDIR/api.log"
fi

if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  ok "app already on :3000"
else
  ( cd apps/app && bun run dev:no-trigger > "$LOGDIR/app.log" 2>&1 & )
  ok "app starting on :3000"
fi

if lsof -nP -iTCP:3002 -sTCP:LISTEN >/dev/null 2>&1; then
  ok "portal already on :3002"
else
  ( cd apps/portal && bun run dev > "$LOGDIR/portal.log" 2>&1 & )
  ok "portal starting on :3002"
fi

bold ""
cat <<EOM
  App:    http://localhost:3000   (sign in: More options → Continue with GitHub)
  Portal: http://localhost:3002
  API:    http://localhost:3333
  MinIO:  http://localhost:9000        (minioadmin / minioadmin)

  Logs:   $LOGDIR/{api,app,portal}.log
  Stop:   ./start-comp.sh stop

  NOTE: use dev:no-trigger, never 'bun run dev'. The default dev script runs
  'trigger dev' under concurrently --kill-others; with no Trigger.dev account
  it exits immediately and takes Next/Nest down with it.
EOM
