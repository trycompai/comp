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

Runs three steps automatically on `git worktree add`:

1. **Create an isolated Postgres database** for this worktree
   (`scripts/setup-worktree-db.sh`). Connects to the Postgres instance
   from the main worktree's `packages/db/.env` and creates
   `compdev_<slug>` if it doesn't already exist. The slug is derived
   from the worktree's directory name (hyphens → underscores,
   lowercase). Returns the isolated `DATABASE_URL`.
2. **Set up `.env*` files** in the new worktree
   (`scripts/link-worktree-envs.sh`). Files without a `DATABASE_URL`
   line are symlinked to the main worktree so shared secrets
   auto-propagate. Files with `DATABASE_URL` get a real copy with
   `DATABASE_URL` (and `DIRECT_URL`) rewritten to the isolated URL —
   this way each worktree uses its own DB while still sharing API
   keys, etc.
3. **Install deps + apply migrations + generate clients** —
   `bun install`, `cd packages/db && bun run db:migrate`, then
   `bun run db:generate` (`scripts/setup-worktree.sh`). The full
   `bun run build` is opt-in because it adds several minutes and most
   dev workflows (`dev`, tests, typechecks) don't need it.

The hook fires **only** inside `git worktree add` — regular `git checkout`,
`git switch`, and file checkouts are filtered by checking that the
previous HEAD is the null SHA (true only for fresh checkouts) and that
the current worktree isn't the main one.

Step 2 is synchronous on purpose: callers — including Claude Code —
typically start running commands in the new worktree immediately, and we
don't want them racing ahead of the install.

Toggles:
- `SKIP_WORKTREE_DB=1 git worktree add …` — skip isolated DB creation
  and `DATABASE_URL` rewriting. The worktree uses the shared `comp` DB
  (same behavior as before DB isolation was added).
- `SKIP_WORKTREE_SETUP=1 git worktree add …` — skip install + generate
  (just link envs + create the DB).
- `SETUP_WORKTREE_WITH_BUILD=1 git worktree add …` — also run
  `bun run build` when you actually need the built artifacts.

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

Env files without `DATABASE_URL` are still symlinks — editing them
mutates the shared file in the main worktree. Files with `DATABASE_URL`
are real copies taken at worktree creation time; if you add a new env
var to a main-worktree `.env` that you want to see in existing
worktrees, re-run
`ISOLATED_DATABASE_URL=<url> scripts/link-worktree-envs.sh <path>` to
regenerate (or delete the file in the worktree and re-run the linker).

For ad-hoc per-worktree values (alternate ports, etc.), use
`.env.local` — loaded by Next.js and NestJS on top of `.env`, and
never touched by the hook.

## Cleaning up dead worktree databases

The hook creates `compdev_<slug>` databases but doesn't drop them when
you remove a worktree (git has no pre-worktree-remove hook). To clean
up old ones occasionally:

```sh
# List all compdev_* DBs
psql "$(grep ^DATABASE_URL= packages/db/.env | cut -d= -f2-)" \
  -tAc "SELECT datname FROM pg_database WHERE datname LIKE 'compdev\\_%'"

# Drop a specific one
psql "<mgmt-url>" -c 'DROP DATABASE "compdev_old_feature"'
```
