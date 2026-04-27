---
name: new-feature-setup
description: Use when starting a new feature, Linear ticket, or bugfix in this repo — establishes the branch + worktree + env + DB + dev-server conventions so the work is immediately ready to code without fighting infra. Triggers on "start a new feature", "spin up a worktree", "begin ticket", "new branch".
---

# New Feature Setup (comp monorepo)

## Overview

This repo has a lot of infrastructure pre-wired into `git worktree add`. Use it. Don't reinvent env copying, database setup, or dependency install flows in every new session.

## When to Use

- User says "start a new feature", "spin up a worktree for X", "begin this Linear ticket", "new branch for …"
- Before running `bun install` / `bun run db:generate` manually in a new directory
- Before copying `.env` files around by hand

## When NOT to Use

- User is editing an existing worktree (already set up)
- Infra repair / debugging of the hook itself (read `.githooks/README.md` instead)

## Workflow

### 1. Create the worktree from `origin/main`

```sh
cd /Users/mariano/code/comp   # must be the MAIN clone, not another worktree
git fetch origin main
git worktree add .worktrees/<short-slug> -b <branch-name> origin/main
```

- For Linear tickets, use Linear's suggested branch name (`mariano/<ticket-slug>`).
- For infra / chore work, use `mariano/<short-descriptive-name>` or `chore/<topic>`.
- The `<short-slug>` on the worktree path should match the branch's suffix (it becomes the Postgres DB slug after `tr '-' '_'`).

### 2. Let the hook do everything else

`git worktree add` fires the `post-checkout` hook at `.githooks/post-checkout`, which runs synchronously:

1. Creates `compdev_<slug>` Postgres database (isolated per worktree)
2. Links `.env*` files from the main clone (copies the ones with `DATABASE_URL`, rewriting it to the isolated URL; symlinks the rest so API keys auto-propagate)
3. Runs `bun install`, applies Prisma migrations, regenerates clients

**Do not** run any of these by hand. If the hook logs a failure, diagnose and fix at the source — don't paper over with a manual install.

Skip toggles (rare):
- `SKIP_WORKTREE_DB=1` — share the main `comp` DB (drift risk; only for read-only worktrees)
- `SKIP_WORKTREE_SETUP=1` — skip install + migrate + generate (for a "just files" worktree)
- `SETUP_WORKTREE_WITH_BUILD=1` — also run `bun run build` (adds minutes; only when you need the built artifacts)

### 3. Start the dev server — coordinate with the "active worktree" rule

Trigger.dev's `trigger dev` CLI **cannot** be isolated per worktree. Running `bun run dev` in multiple worktrees stomps on task registration.

- **One active worktree** runs `bun run dev` (full stack with `trigger dev`).
- **All other worktrees** run:
  ```sh
  bun run --filter '@trycompai/app' dev:no-trigger    # Next.js only
  bun run --filter '@trycompai/api' dev:no-trigger    # NestJS only
  ```
- Non-active worktrees need a different `PORT` to avoid collision — add `PORT=3001` (or `3334`, etc.) to the worktree's `.env.local`. `.env.local` is not symlinked and stays per-worktree.
- When swapping which worktree is active, kill the old full `bun run dev` first so task registration is clean.

### 4. Code the feature

Standard repo conventions apply (see `AGENTS.md`). Highlights:
- TDD for any non-trivial change (`superpowers:test-driven-development`)
- Brainstorm before building new UX (`superpowers:brainstorming`)
- Plans + subagent-driven execution for multi-step work
- Run `audit-design-system` after any frontend component edit
- Always run typecheck before declaring a change done (`npx turbo run typecheck --filter=<pkg>`)

### 5. When done, clean up

Use the `stale-worktree-cleanup` skill when worktrees accumulate. It handles both `git worktree remove` and dropping the `compdev_<slug>` database in one pass. Never leave orphan databases — they pile up silently because git has no `pre-worktree-remove` hook.

## Quick Reference

```sh
# Spin up a new worktree (does env + DB + install + migrate + generate automatically)
git worktree add .worktrees/<slug> -b mariano/<branch-name> origin/main

# Start dev — ONLY in the worktree you're actively iterating on
cd .worktrees/<slug>
bun run dev

# Start dev in a background worktree (no trigger dev, custom port via .env.local)
echo "PORT=3001" >> apps/app/.env.local
bun run --filter '@trycompai/app' dev:no-trigger

# Clean up when branch is done
# (use the stale-worktree-cleanup skill)
```

## Red Flags

If you catch yourself doing any of these, stop — the hook should have handled it:

- Running `bun install` manually in a new worktree
- `cp` or `ln -s` to copy `.env` files into a worktree
- Writing a script that "creates a database for my branch"
- Running `bun run db:migrate` in a worktree right after creating it
- Ignoring a failing `bun run dev` in two worktrees instead of swapping to `dev:no-trigger`

## Common Mistakes

| Mistake | Fix |
|---|---|
| Creating the worktree from another worktree instead of the main clone | Always `cd` to `/Users/mariano/code/comp` first |
| Editing `.env` in a worktree and expecting it to propagate | If it's a symlink, yes; if it's a real copy (has `DATABASE_URL`), no. Check with `ls -la`. |
| Forgetting to bump `PORT` → two dev servers collide | Put `PORT=<free-port>` in the worktree's `.env.local` |
| Running `trigger dev` in multiple worktrees | Switch to `dev:no-trigger` in all but one |
| Not cleaning up → orphan `compdev_*` databases piling up | Use the `stale-worktree-cleanup` skill regularly |
