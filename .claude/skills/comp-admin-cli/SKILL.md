---
name: comp-admin-cli
description: "Use when working with the Comp admin CLI (packages/cli) — adding commands, debugging admin API endpoints, testing the CLI, or helping users with CLI setup and usage. Also use when adding new admin API endpoints that need CLI support."
---

# Comp Admin CLI

> Admin CLI for the Comp platform. Wraps the Admin API (`/v1/admin/*`) for platform management and user debugging.

## When to Use

- Adding or modifying CLI commands
- Adding new admin API endpoints (always add matching CLI command)
- Debugging admin API responses via CLI
- Setting up the CLI for a new developer
- Testing admin functionality end-to-end

## Architecture

```
packages/cli/
  bin/comp               Shell wrapper (runs from source via bun)
  src/
    index.ts             Entry point — command router, help dispatch
    config.ts            Multi-env config (read/write ~/.comprc, 600 perms)
    client.ts            HTTP client (adminFetch with Bearer session auth)
    help.ts              Help text for root and all commands
    utils.ts             extractFlag, hasFlag, output, die helpers
    commands/
      init.ts            Configure environment (local/staging/production)
      login.ts           OAuth login via browser (Google/GitHub/Microsoft)
      logout.ts          Clear stored session
      env.ts             Show or switch active environment
      stats.ts           Platform overview
      orgs.ts            List/get organizations
      users.ts           List/search/get users, toggle platform admin
      audit-logs.ts      Query audit logs with filters
```

### Config Format (`~/.comprc`)

```json
{
  "activeEnv": "local",
  "environments": {
    "local": {
      "apiUrl": "http://localhost:3333",
      "session": {
        "token": "better-auth-session-token",
        "email": "admin@example.com",
        "expiresAt": "2026-03-15T17:00:00.000Z"
      }
    }
  }
}
```

File is created with `0o600` permissions to protect session tokens.

### Auth Flow

1. `comp login` opens browser → Google OAuth via the app's auth proxy
2. After OAuth, better-auth sets session cookie on the app's domain
3. App's `/api/cli/callback` relay reads the cookie, redirects to `localhost:8417/callback?token=SESSION_TOKEN`
4. CLI captures the token, stores it in `~/.comprc` with 1-hour TTL
5. All admin commands send `Authorization: Bearer <sessionToken>` via `adminFetch()`
6. `PlatformAdminGuard` resolves the session via better-auth, checks `isPlatformAdmin` on the user

### Guard: PlatformAdminGuard

Located at `apps/api/src/auth/platform-admin.guard.ts`. Uses session-based auth only (no shared secrets). Checks `isPlatformAdmin` flag on the user record in the database. This is separate from org-scoped RBAC — platform admins can see all orgs.

## Adding a New Command

Follow this 5-step pattern:

### 1. Add the Admin API Endpoint

In `apps/api/src/admin/admin.controller.ts` and `admin.service.ts`:

```typescript
// Controller
@Get('new-thing')
async getNewThing(@Query('limit') limit?: string) {
  return this.adminService.getNewThing({
    limit: limit ? parseInt(limit, 10) : 20,
  });
}

// Service
async getNewThing({ limit }: { limit: number }) {
  return db.newThing.findMany({ take: limit, orderBy: { createdAt: 'desc' } });
}
```

### 2. Add the CLI Command

```typescript
// packages/cli/src/commands/new-thing.ts
import { adminFetch } from '../client';
import { extractFlag, output } from '../utils';

export async function newThingCommand(args: string[]): Promise<void> {
  const limit = extractFlag(args, '--limit') ?? '20';
  const result = await adminFetch(`new-thing?limit=${limit}`);
  output(result);
}
```

### 3. Register in Router

In `packages/cli/src/index.ts`:
```typescript
case 'new-thing':
  await newThingCommand(commandArgs);
  break;
```

### 4. Add Help Text

In `packages/cli/src/help.ts`, add to `ROOT_HELP` and `COMMAND_HELP`.

### 5. Write Tests

- API: `apps/api/src/admin/admin.service.spec.ts` (Jest, mock `@trycompai/db`)
- API: `apps/api/src/admin/admin.controller.spec.ts` (Jest, mock service + guard)
- CLI: `packages/cli/src/commands/new-thing.test.ts` (bun:test)

## Key Patterns

### Output Convention

- **Data** goes to `stdout` via `output()` (JSON, pipe to `jq`)
- **Errors** go to `stderr` via `die()` (ANSI red prefix, exits with code 1)
- **Help** goes to `stdout` via `showHelp()` (ANSI-colored)

### Error Handling

- Missing session: `die('Session expired or not logged in. Run: comp login')`
- API 401: `die('Session expired. Run: comp login')`
- API 403: `die('Access denied — your account does not have platform admin privileges.')`
- API errors: `die('API error <status>: <body>')`
- Connection failure: `die('Cannot connect to <url> — is the API running?')`

### Help System

Three ways to get help — all must work:
- `comp help <command>`
- `comp <command>` (bare, for commands needing subcommand)
- `comp help` (root)

## Setup for New Developers

```bash
bun install                        # registers workspace
bun run cli:install                # or: cd packages/cli && bun link
comp init --local                  # configure local API URL
comp login                         # authenticate via browser OAuth
comp stats                         # verify connection
```

The shell wrapper (`bin/comp`) resolves symlinks and runs `src/index.ts` via bun — no build step, edits are instant.

## Testing

```bash
# Unit tests
cd apps/api && npx jest src/admin --passWithNoTests       # API tests (Jest)
cd apps/app && npx vitest run src/app/api/cli              # Callback route (Vitest)
cd packages/cli && bun test                                 # CLI tests (bun:test)

# Manual end-to-end (requires local API running)
comp login --local
comp stats
comp orgs
comp users search --email someone@
```

## Current Admin API Endpoints

| CLI Command | HTTP | API Path |
|---|---|---|
| `comp stats` | GET | `/v1/admin/stats` |
| `comp orgs` | GET | `/v1/admin/orgs` |
| `comp orgs <id>` | GET | `/v1/admin/orgs/:id` |
| `comp orgs search --query <q>` | GET | `/v1/admin/orgs/search?q=` |
| `comp org <id> health` | GET | `/v1/admin/orgs/:orgId/health` |
| `comp org <id> members` | GET | `/v1/admin/orgs/:orgId/members` |
| `comp org <id> policies` | GET | `/v1/admin/orgs/:orgId/policies` |
| `comp org <id> tasks` | GET | `/v1/admin/orgs/:orgId/tasks` |
| `comp org <id> controls` | GET | `/v1/admin/orgs/:orgId/controls` |
| `comp org <id> risks` | GET | `/v1/admin/orgs/:orgId/risks` |
| `comp org <id> vendors` | GET | `/v1/admin/orgs/:orgId/vendors` |
| `comp org <id> frameworks` | GET | `/v1/admin/orgs/:orgId/frameworks` |
| `comp org <id> findings` | GET | `/v1/admin/orgs/:orgId/findings` |
| `comp org <id> integrations` | GET | `/v1/admin/orgs/:orgId/integrations` |
| `comp org <id> comments` | GET | `/v1/admin/orgs/:orgId/comments` |
| `comp org <id> audit-logs` | GET | `/v1/admin/orgs/:orgId/audit-logs` |
| `comp users` | GET | `/v1/admin/users` |
| `comp users search --email <q>` | GET | `/v1/admin/users/search?email=` |
| `comp users <id>` | GET | `/v1/admin/users/:id` |
| `comp users platform-admin <id>` | POST | `/v1/admin/users/:id/platform-admin` |
| `comp audit-logs` | GET | `/v1/admin/audit-logs` |
