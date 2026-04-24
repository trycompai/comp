#!/usr/bin/env bash
# Prepare a freshly created worktree: install deps, generate Prisma client,
# run the full build. Assumes `.env*` files are already linked in (the
# post-checkout hook does that before calling this script).
#
# Usage:
#   scripts/setup-worktree.sh [target-worktree-path]
#
# Defaults to the current working directory. Skippable via
# `SKIP_WORKTREE_SETUP=1` for callers that just want the worktree checked
# out without the (slow) install/build cycle.
set -euo pipefail

if [[ "${SKIP_WORKTREE_SETUP:-}" == "1" ]]; then
  echo "setup-worktree: SKIP_WORKTREE_SETUP=1 — skipping install + build" >&2
  exit 0
fi

target="${1:-$(pwd)}"
target=$(cd "$target" && pwd)

# Refuse to run on the main worktree — it already has its own lifecycle.
main=$(git worktree list --porcelain | awk '$1=="worktree"{print $2; exit}')
if [[ "$target" == "$main" ]]; then
  echo "setup-worktree: target is the main worktree — skipping" >&2
  exit 0
fi

cd "$target"

echo "▸ Installing dependencies (bun install) in $target"
bun install

echo "▸ Generating Prisma client (bun run db:generate)"
bun run db:generate

echo "▸ Building all packages (bun run build)"
bun run build

echo "✓ Worktree setup complete: $target"
