# Code Review Guidelines

## Always check

### RBAC & Security
- Every customer-facing API endpoint MUST have `@UseGuards(HybridAuthGuard, PermissionGuard)` and `@RequirePermission('resource', 'action')`
- `@Public()` is only acceptable for webhooks and unauthenticated endpoints (e.g., trust portal public pages)
- No manual role string parsing (`role.includes('admin')`) — always use permission check utilities
- Frontend mutation buttons must be gated with `hasPermission(permissions, 'resource', 'action')`
- Raw `fetch()` calls to the API must include `credentials: 'include'`
- Database queries must be scoped by `organizationId` for multi-tenancy
- Error messages must not leak internal details (stack traces, DB structure, internal IDs)

### Server Actions & API Architecture
- No new server actions — client components should call the NestJS API directly via `apiClient`/`api` or SWR hooks
- No `useAction` from `next-safe-action` in new code
- No direct `@db` imports in the Next.js app for mutations — all mutations go through the NestJS API
- Server actions are acceptable ONLY for server-side-only operations like encryption/decryption that need access to server env vars
- Multi-step orchestration should use Next.js API routes (`apps/app/src/app/api/...`), not server actions

### Design System
- New UI must use `@trycompai/design-system` components, not `@comp/ui` (legacy, being phased out)
- Icons must come from `@trycompai/design-system/icons` (Carbon icons), not `lucide-react`
- DS components `Text`, `Stack`, `HStack`, `Badge`, `Button` do not accept `className` — wrap in a `<div>` for custom styling
- Use DS `Button` props like `loading`, `iconLeft`, `iconRight` instead of manually rendering spinners/icons inside buttons

### TypeScript
- No `as any` casts — use proper types, generics, or `unknown` with type guards
- No `@ts-ignore` or `@ts-expect-error` — fix the underlying type issue
- Files must not exceed 300 lines — split into focused modules

### Data Fetching
- Client components should use `useSWR` with `apiClient` or custom hooks
- Server components should fetch with `serverApi` and pass as `fallbackData`
- `mutate()` optimistic update functions must guard against `undefined` input
- Use `Array.isArray()` checks when consuming SWR data that could be stale

### Database
- New IDs must use prefixed CUIDs: `@default(dbgenerated("generate_prefixed_cuid('prefix'::text)"))`
- Operations modifying multiple records must use transactions
- Migrations must be backward-compatible

### API Controller Format
- Controllers must use `@Controller({ path: 'name', version: '1' })`, NOT `@Controller('v1/name')` (causes double prefix bug)
- API list endpoints return `{ data: [...], count }` — single resource endpoints return the entity flat

### Forms
- Forms must use React Hook Form + Zod validation
- No `useState` for form field values — use the form's state management

## Skip
- Pre-existing `@comp/ui` usage in files not touched by the PR
- Pre-existing `lucide-react` usage in files not touched by the PR
- Pre-existing server actions in files not touched by the PR
- Test files using simplified mock types
- Generated files under `packages/db/prisma/generated/`
- OpenAPI spec file `packages/docs/openapi.json`
