#!/usr/bin/env bash
# Symlink every .env* file from the main worktree into a target worktree.
#
# Usage:
#   scripts/link-worktree-envs.sh [target-worktree-path]
#
# If no target is given, uses the current working directory. The script is
# safe to re-run — it overwrites existing symlinks with `ln -sfn`.
#
# Also invoked automatically by .githooks/post-checkout after
# `git worktree add`; run it manually to backfill worktrees created before
# the hook was installed.
set -euo pipefail

target="${1:-$(pwd)}"

# The first line of `git worktree list --porcelain` is the main worktree.
main=$(git worktree list --porcelain | awk '$1=="worktree"{print $2; exit}')

if [[ -z "$main" ]]; then
  echo "error: could not resolve main worktree" >&2
  exit 1
fi

# Resolve target to absolute path
target=$(cd "$target" && pwd)

if [[ "$target" == "$main" ]]; then
  echo "skip: target is the main worktree ($main)" >&2
  exit 0
fi

cd "$main"

linked=0
while IFS= read -r -d '' env; do
  rel="${env#./}"
  src="$main/$rel"
  link="$target/$rel"
  mkdir -p "$(dirname "$link")"
  ln -sfn "$src" "$link"
  linked=$((linked + 1))
done < <(
  find . -maxdepth 3 -name ".env*" \
    ! -name "*.example" \
    -not -path "./node_modules/*" \
    -not -path "./.worktrees/*" \
    -not -path "./.git/*" \
    -print0
)

echo "linked $linked env file(s) from $main into $target" >&2
