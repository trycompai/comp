# Project Rules

## Tooling

- **Package manager**: `bun` (never npm/yarn/pnpm)
- **Build**: `bun run build` (uses turbo). Filter: `bun run --filter '@comp/app' build`
- **Typecheck**: `bun run typecheck` or `npx turbo run typecheck --filter=@comp/api`
- **Tests (app)**: `cd apps/app && npx vitest run`
- **Tests (api)**: `cd apps/api && npx jest src/<module> --passWithNoTests`
- **Lint**: `bun run lint`

## Code Style

- **Max 300 lines per file.** Split into focused modules if exceeded.
- **No `as any` casts.** Ever. Use proper types, generics, or `unknown` with type guards.
- **No `@ts-ignore` or `@ts-expect-error`.** Fix the type instead.
- **Strict TypeScript**: Use zod for runtime validation, generics over `any`.
- **Early returns** to avoid nested conditionals.
- **Named parameters** for functions with 2+ arguments.
- **Event handlers**: prefix with `handle` (e.g., `handleSubmit`).

## Monorepo Structure

```
apps/
  api/          # NestJS API (auth, RBAC, business logic)
  app/          # Next.js frontend (compliance + security products)
  portal/       # Employee portal
packages/
  auth/         # RBAC definitions (permissions.ts) — single source of truth
  db/           # Prisma schema + client
  ui/           # Legacy component library (being phased out)
```

## Authentication & Session

- **Auth lives in `apps/api` (NestJS).** The API is the single source of truth for authentication via better-auth. All apps and packages that need to authenticate (app, portal, device-agent, etc.) MUST go through the API — never run a local better-auth instance or handle auth directly in a frontend app.
- **Session-based auth only.** No JWT tokens. Cross-subdomain cookies (`.trycomp.ai`) allow sessions to work across all apps.
- **HybridAuthGuard** supports 3 methods in order: API Key (`x-api-key`), Service Token (`x-service-token`), Session (cookies). `@Public()` skips auth.
- **Client-side auth**: `authClient` (better-auth client) with `baseURL` pointing to the API, NOT the current app.
- **Client-side data**: `apiClient` from `@/lib/api-client` (always sends cookies).
- **Server-side data**: `serverApi` from `@/lib/api-server.ts`.
- **Server-side session checks**: Proxy to the API's `/api/auth/get-session` endpoint — do NOT instantiate better-auth locally.
- **Raw `fetch()` to API**: MUST include `credentials: 'include'`, otherwise 401.

## API Architecture

We are migrating away from Next.js server actions toward calling the NestJS API directly.

### Simple CRUD operations
Client components call the NestJS API via custom SWR hooks. No server action wrapper needed.

### Multi-step orchestration
When an operation requires multiple API calls (e.g., S3 upload + PATCH), create a Next.js API route (`apps/app/src/app/api/...`) that orchestrates them.

### What NOT to do
- Do NOT use server actions for new features
- Do NOT keep server actions as wrappers around API calls
- Do NOT add direct database (`@db`) access in the Next.js app for mutations — always go through the API
- Do NOT use `useAction` from `next-safe-action` for new code

### API Client
- Server-side (Next.js API routes/pages): `serverApi` from `apps/app/src/lib/api-server.ts`
- Client-side (hooks): `apiClient` / `api` from `@/lib/api-client`

### API Response Format
- **List endpoints**: `{ data: [...], count, authType, authenticatedUser }` → access via `response.data.data`
- **Single resource endpoints**: `{ ...entity, authType, authenticatedUser }` → access via `response.data`
- Both `apiClient` and `serverApi` wrap in `{ data, error, status }`

## RBAC

### Permissions Model
- Flat `resource:action` model (e.g., `pentest:read`, `control:update`)
- Single source of truth: `packages/auth/src/permissions.ts`
- Built-in roles: `owner`, `admin`, `auditor`, `employee`, `contractor`
- Custom roles: stored in `organization_role` table per organization
- Multiple roles per user (comma-separated in `member.role`)

### Multi-Product Architecture
- **Products** (compliance, pen testing) are org-level subscription/feature flags — NOT RBAC
- **RBAC** controls user access within products
- `app:read` gates the compliance dashboard; `pentest:read` gates security product
- Portal-only resources (`policy`, `compliance`) do NOT grant app access

### API Endpoint Requirements
Every customer-facing API endpoint MUST have:
```typescript
@UseGuards(HybridAuthGuard, PermissionGuard)  // at controller or endpoint level
@RequirePermission('resource', 'action')       // on every endpoint
```
- Controller format: `@Controller({ path: 'name', version: '1' })`, NOT `@Controller('v1/name')`
- `@Public()` for unauthenticated endpoints (webhooks, etc.)
- The `AuditLogInterceptor` only logs when `@RequirePermission` metadata is present

### Frontend Permission Gating
- **Nav items**: Gate with `canAccessRoute(permissions, 'routeSegment')`
- **Rail icons**: Gate product sections (Compliance, Security, Trust, Settings) by permission
- **Mutation buttons**: Gate with `hasPermission(permissions, 'resource', 'action')`
- **Page-level**: Every product layout uses `requireRoutePermission('segment', orgId)` server-side
- **Route permissions**: Defined in `ROUTE_PERMISSIONS` in `apps/app/src/lib/permissions.ts`
- No manual role string parsing (`role.includes('admin')`) — always use permission checks

### Permission Resources
`organization`, `member`, `control`, `evidence`, `policy`, `risk`, `vendor`, `task`, `framework`, `audit`, `finding`, `questionnaire`, `integration`, `apiKey`, `trust`, `pentest`, `app`, `compliance`

## Design System

- **Always prefer `@trycompai/design-system`** over `@comp/ui`. Check DS exports first.
- `@comp/ui` is the legacy library being phased out — only use as last resort.
- **Icons**: `@trycompai/design-system/icons` (Carbon icons), NOT `lucide-react`
- **DS components that do NOT accept `className`**: `Text`, `Stack`, `HStack`, `Badge`, `Button` — wrap in `<div>` for custom styling
- **Layout**: Use `PageLayout`, `PageHeader`, `Stack`, `HStack`, `Section`, `SettingGroup`
- **Patterns**: Sheet (`Sheet > SheetContent > SheetHeader + SheetBody`), Drawer, Collapsible
- **After editing any frontend component**: Run the `audit-design-system` skill to catch `@comp/ui` or `lucide-react` imports that should be migrated

## Data Fetching

- **Server components**: Fetch with `serverApi`, pass as `fallbackData` to client
- **Client components**: `useSWR` with `apiClient` or custom hooks (e.g., `usePolicy`, `useTask`)
- **SWR hooks**: Use `fallbackData` for SSR initial data, `revalidateOnMount: !initialData`
- **`mutate()` safety**: Guard against `undefined` in optimistic update functions
- **`Array.isArray()` checks**: When consuming SWR data that could be stale

## Testing

- **Every new feature MUST include tests.** No exceptions.
- **TDD preferred**: Write failing tests first, then make them pass.
- **App tests**: Vitest + @testing-library/react (jsdom environment)
- **API tests**: Jest with NestJS testing utilities
- **Permission tests**: Test admin (write) and read-only user scenarios
- **Run from package dir**: `cd apps/app && npx vitest run` or `cd apps/api && npx jest`

## Database

- **Schema**: `packages/db/prisma/schema/` (split into files per model)
- **IDs**: Always use prefixed CUIDs: `@default(dbgenerated("generate_prefixed_cuid('prefix'::text)"))`
- **Migrations**: `cd packages/db && bunx prisma migrate dev --name your_name`
- **Multi-tenancy**: Always scope queries by `organizationId`
- **Transactions**: Use for operations modifying multiple records

## Git

- **Conventional commits**: `<type>(<scope>): <description>` (imperative, lowercase)
- **Never use `git stash`** unless explicitly asked
- **Never skip hooks** (`--no-verify`)
- **Never force push** to main/master

## Forms

- All forms use **React Hook Form + Zod** validation
- Define Zod schema first, infer type with `z.infer<typeof schema>`
- Use `Controller` for complex components (Select, Combobox)
- Never use `useState` for form field values
