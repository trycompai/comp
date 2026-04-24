# Git hooks

Shared, repo-tracked git hooks for this project.

## Setup (once per clone)

```sh
git config core.hooksPath .githooks
```

All worktrees share a single `.git/` directory with the main clone, so this
one `git config` call enables the hooks for every current and future
worktree — no need to re-run after `git worktree add`.

## What's here

### `post-checkout`

Runs two steps automatically on `git worktree add`:

1. **Symlink `.env*` files** from the main worktree (`scripts/link-worktree-envs.sh`).
2. **Set up the worktree** — `bun install`, `bun run db:generate`, `bun run build`
   (`scripts/setup-worktree.sh`).

The hook fires **only** inside `git worktree add` — regular `git checkout`,
`git switch`, and file checkouts are filtered by checking that the
previous HEAD is the null SHA (true only for fresh checkouts) and that
the current worktree isn't the main one.

Step 2 is slow (minutes) but synchronous on purpose: callers — including
Claude Code — typically start running commands in the new worktree
immediately, and we don't want them racing ahead of the install.

Skip step 2 for a fast "just give me the files" worktree with
`SKIP_WORKTREE_SETUP=1 git worktree add …`.

## Backfilling existing worktrees

For worktrees created before the hook was installed:

```sh
# From inside the worktree that needs envs linked:
scripts/link-worktree-envs.sh

# Or pass an explicit path from anywhere:
scripts/link-worktree-envs.sh /path/to/.worktrees/some-feature

# And/or run the full install + build:
scripts/setup-worktree.sh /path/to/.worktrees/some-feature
```

## Per-worktree overrides

The symlinks point at the main worktree's files, so editing `.env` in any
worktree mutates the shared file. Use `.env.local` (loaded by Next.js and
NestJS on top of `.env`) for per-worktree values like alternate ports or
databases — `.env.local` is not symlinked and stays local to the worktree.
