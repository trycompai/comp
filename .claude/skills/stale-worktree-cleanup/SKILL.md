---
name: stale-worktree-cleanup
description: Use when cleaning up old git worktrees, removing worktrees whose branches have merged or been abandoned, or dropping orphaned compdev_* Postgres databases. Triggers on "clean up worktrees", "delete stale worktrees", "worktrees piling up", "orphaned databases", "remove unused worktree".
---

# Stale Worktree Cleanup

## Overview

This repo's `.githooks/post-checkout` creates a per-worktree Postgres database (`compdev_<slug>`) on every `git worktree add`. Git has no `pre-worktree-remove` hook, so dead databases pile up over time. This skill defines a safe, reversible process to reap both the worktree directories and their dangling databases together.

**Core principle**: never delete work the user might still want. Classify first, ask second, remove last.

## When to Use

- User says "clean up worktrees", "delete stale worktrees", "remove old worktrees", "worktrees piling up"
- User mentions orphaned `compdev_*` DBs or running out of disk space from dead `node_modules`
- Starting a new feature and noticing many old worktree dirs

## When NOT to Use

- User wants to remove ONE specific worktree (just run `git worktree remove <path>` + drop its DB directly — don't load the whole process)
- User is actively working in a worktree (never touch active work)

## Process

### Step 1 — Inventory

Run these four commands (parallel-safe) and capture the output:

```sh
git worktree list --porcelain
gh pr list --author @me --state all --limit 50 --json headRefName,state,url,number
git branch --no-color | cat
```

Then query the DB for `compdev_*` databases. The management URL is the main worktree's `DATABASE_URL` with the database path swapped to `postgres`:

```sh
bun -e '
  import { Client } from "pg";
  const raw = require("fs").readFileSync("packages/db/.env", "utf8");
  const url = raw.match(/^DATABASE_URL=(.*)$/m)[1].replace(/^["\x27]|["\x27]$/g, "");
  const mgmt = url.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
  const c = new Client({ connectionString: mgmt });
  await c.connect();
  const r = await c.query("SELECT datname FROM pg_database WHERE datname LIKE \x27compdev\\\\_%\x27 ORDER BY 1");
  for (const row of r.rows) console.log(row.datname);
  await c.end();
'
```

### Step 2 — Classify each worktree

For each worktree (skip the main one):

| Signal | Classification |
|---|---|
| Branch merged to main AND clean working tree AND no unpushed commits | **safe** |
| PR is `CLOSED` (not merged) | **needs-confirm** |
| Uncommitted changes OR unpushed commits | **needs-confirm** |
| No matching PR, no merge, has local commits | **keep** (user may still be working on it) |
| Is the main worktree | **skip** |

Gather per worktree:
- `cd <path> && git status --porcelain | wc -l` — uncommitted changes count
- `cd <path> && git log @{upstream}..HEAD --oneline 2>/dev/null | wc -l` — unpushed commits (0 if no upstream)
- Branch → PR lookup from step 1

### Step 3 — Present to user

Show a table and explicit recommendations. Example:

```
Path                                    Branch                              PR state  Changes  Recommendation
.worktrees/sale-45-…                    mariano/sale-45-…                   MERGED    0 / 0    ✅ safe to remove
.worktrees/old-experiment               mariano/scratch                     —         3 / 0    ⚠ uncommitted — confirm first
.worktrees/worktree-env-auto-link       mariano/worktree-env-auto-link      OPEN      0 / 0    ⏳ keep (PR open)

Orphan databases (no worktree dir):
  compdev_abandoned_feature
  compdev_old_migration_test
```

Then ask: **"Remove the items marked ✅? Confirm by listing anything you want me to also nuke from the ⚠ / ⏳ set."**

### Step 4 — Remove confirmed items

For each worktree the user approved:

```sh
# 1. Remove the worktree dir (use --force only if user confirmed dirty-removal)
git worktree remove "<path>"           # clean case
git worktree remove --force "<path>"   # only after explicit user OK

# 2. Derive the slug and drop the database
slug=$(basename "<path>" | tr '[:upper:]' '[:lower:]' | tr '-' '_' | tr -cd 'a-z0-9_')
bun -e '
  import { Client } from "pg";
  const raw = require("fs").readFileSync("packages/db/.env", "utf8");
  const url = raw.match(/^DATABASE_URL=(.*)$/m)[1].replace(/^["\x27]|["\x27]$/g, "");
  const mgmt = url.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
  const c = new Client({ connectionString: mgmt });
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS "compdev_'"$slug"'"`);
  await c.end();
  console.log("dropped compdev_'"$slug"'");
'
```

For orphan databases (no matching worktree dir), just drop them — no worktree to remove.

**Do NOT** delete the local branch unless the user explicitly asked. Branches can be recreated from `origin` cheaply; worktrees cannot.

### Step 5 — Verify and report

```sh
git worktree list
# then re-run the compdev_* query from step 1
```

Report back:
- Worktrees removed (paths)
- Databases dropped (names)
- Anything skipped and why
- What's left (still-active worktrees)

## Safety Rules

- **Never remove the main worktree.** Its path is always the first line of `git worktree list --porcelain`.
- **Never `--force` without confirmation.** Dirty worktrees can contain un-stashed work.
- **Never `DROP DATABASE` on anything not matching `^compdev_[a-z0-9_]+$`.** Never drop `comp`, `postgres`, or any production-looking name.
- **Never delete a local branch** as part of cleanup unless the user explicitly asks. Orphaned branches are cheap; lost work isn't.
- **Never run this inside a worktree you're about to delete.** `cd` to the main worktree first.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Dropping the DB but leaving the worktree dir | Run `git worktree prune` then `git worktree remove` |
| Removing the worktree but leaving the DB (accumulates orphans) | Always do both in the same pass |
| Using hyphens in the DB name | The hook slug rule is `tr '-' '_'` — always underscores |
| Running from inside a doomed worktree | `cd` to the main worktree before starting the process |
| Using `gh pr list` on a branch with no PR | Missing data is not "abandoned" — needs `needs-confirm` classification |

## Red Flags

If any of these show up mid-process, **stop and ask the user**:

- A worktree has unpushed commits AND no PR → might be unreleased work
- The classification returned >10 "safe to remove" items → unusual volume, double-check
- `git worktree remove` errors with "working tree is not clean" → never retry with `--force` without explicit consent
- A `compdev_*` name has weird characters or unexpected format → don't drop

## Quick Reference

```sh
# List everything
git worktree list --porcelain
gh pr list --author @me --state all --limit 50 --json headRefName,state

# Per-worktree inspection
git -C <path> status --porcelain
git -C <path> log @{upstream}..HEAD --oneline 2>/dev/null

# Clean removal
git worktree remove <path>

# Dirty removal (requires user confirmation first)
git worktree remove --force <path>

# Database drop (run from main worktree)
# See the bun -e snippets above for the exact invocation
```
