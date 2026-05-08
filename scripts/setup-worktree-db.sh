#!/usr/bin/env bash
# Create a per-worktree Postgres database and print its connection URL on
# stdout. Uses the connection info from the main worktree's packages/db/.env.
#
# Usage:
#   scripts/setup-worktree-db.sh [target-worktree-path]
#
# Output (stdout): the isolated DATABASE_URL (postgresql://...)
# Logs go to stderr.
#
# Requires `psql` on PATH.
set -euo pipefail

# Resolve paths from the script's own location so this works regardless of
# which worktree holds the script file (main vs. any worktree vs. the
# hook's own copy at core.hooksPath).
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

target="${1:-$(pwd)}"
target=$(cd "$target" && pwd)

main=$(git worktree list --porcelain | awk '$1=="worktree"{print $2; exit}')
if [[ "$target" == "$main" ]]; then
  echo "setup-worktree-db: target is the main worktree — skipping" >&2
  exit 0
fi

# Slug: basename of the worktree dir, lowercased, hyphens → underscores,
# anything non-[a-z0-9_] dropped. Postgres identifiers don't tolerate hyphens.
raw=$(basename "$target")
slug=$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]' | tr '-' '_' | tr -cd 'a-z0-9_')
db_name="compdev_${slug}"

# Source connection info from main's packages/db/.env.
src_env="$main/packages/db/.env"
if [[ ! -f "$src_env" ]]; then
  echo "setup-worktree-db: $src_env not found — can't derive connection info" >&2
  exit 1
fi

src_url=$(grep -E '^DATABASE_URL=' "$src_env" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")
if [[ -z "$src_url" ]]; then
  echo "setup-worktree-db: DATABASE_URL missing in $src_env" >&2
  exit 1
fi

# Replace the database-name segment in the URL (path after host:port, before ?).
# postgresql://user:pass@host:port/dbname?params → .../<db_name>?params
iso_url=$(printf '%s' "$src_url" \
  | perl -pe 's{^(postgres(?:ql)?://[^/]+/)[^?]*(\?.*)?$}{$1'"$db_name"'$2};')

if [[ -z "$iso_url" || "$iso_url" == "$src_url" ]]; then
  echo "setup-worktree-db: failed to rewrite DATABASE_URL (got: $iso_url)" >&2
  exit 1
fi

# Connect to the `postgres` maintenance database (same host/creds) to run
# CREATE DATABASE. Build the maintenance URL the same way.
mgmt_url=$(printf '%s' "$src_url" \
  | perl -pe 's{^(postgres(?:ql)?://[^/]+/)[^?]*(\?.*)?$}{${1}postgres$2};')

# Use the main worktree's node_modules (which always has `pg` via
# @prisma/adapter-pg) so we don't require psql on PATH.
if [[ ! -d "$main/node_modules/pg" ]]; then
  echo "setup-worktree-db: $main/node_modules/pg missing — run bun install in the main worktree first" >&2
  exit 1
fi

(cd "$main" && bun run "$script_dir/create-database.mjs" "$mgmt_url" "$db_name" >&2)

# stdout: the isolated URL for callers to consume
printf '%s\n' "$iso_url"
