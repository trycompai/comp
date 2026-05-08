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

# Optional: per-worktree DATABASE_URL override. When set, any .env file
# whose source contains DATABASE_URL= will be copied (not symlinked) and
# rewritten to point at the isolated URL. All other .env files stay as
# symlinks so API keys and such still auto-propagate.
iso_url="${ISOLATED_DATABASE_URL:-}"

linked=0
rewritten=0
while IFS= read -r -d '' env; do
  rel="${env#./}"
  src="$main/$rel"
  dest="$target/$rel"
  mkdir -p "$(dirname "$dest")"

  if [[ -n "$iso_url" ]] && grep -qE '^DATABASE_URL=' "$src"; then
    # Copy + rewrite DATABASE_URL (and DIRECT_URL, if present).
    rm -f "$dest"
    awk -v u="$iso_url" '
      /^DATABASE_URL=/ { print "DATABASE_URL=" u; next }
      /^DIRECT_URL=/   { print "DIRECT_URL=" u; next }
      { print }
    ' "$src" > "$dest"
    rewritten=$((rewritten + 1))
  else
    ln -sfn "$src" "$dest"
    linked=$((linked + 1))
  fi
done < <(
  find . -maxdepth 3 -name ".env*" \
    ! -name "*.example" \
    -not -path "./node_modules/*" \
    -not -path "./.worktrees/*" \
    -not -path "./.git/*" \
    -print0
)

if [[ -n "$iso_url" ]]; then
  echo "linked $linked env file(s), rewrote DATABASE_URL in $rewritten file(s) -> isolated URL" >&2
else
  echo "linked $linked env file(s) from $main into $target" >&2
fi
