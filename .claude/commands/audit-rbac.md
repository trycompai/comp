# Audit & Fix RBAC / Audit Logs

Audit the specified files or directories for RBAC and audit log compliance. **Fix every issue found immediately.**

## Rules

### API Endpoints (NestJS — `apps/api/src/`)
1. **Every mutation endpoint** (POST, PATCH, PUT, DELETE) MUST have `@RequirePermission('resource', 'action')`. If missing, **add it**.
2. **Read endpoints** (GET) should have `@RequirePermission('resource', 'read')`. If missing, **add it**.
3. **Self-endpoints** (e.g., `/me/preferences`) may skip `@RequirePermission` — authentication via `HybridAuthGuard` is sufficient.
4. **Controller format**: Must use `@Controller({ path: 'name', version: '1' })`, NOT `@Controller('v1/name')`. If wrong, **fix it**.
5. **Guards**: Use `@UseGuards(HybridAuthGuard, PermissionGuard)` at controller or endpoint level. Never skip PermissionGuard.
6. **Webhooks**: External webhook endpoints use `@Public()` — no auth required.

### Frontend Components (`apps/app/src/`)
1. **Every mutation element** (button, form submit, toggle, switch, file upload) MUST be gated with `usePermissions` from `@/hooks/use-permissions`. If not:
   - **Create/Add buttons**: **Wrap** with `{hasPermission('resource', 'create') && <Button>...`
   - **Edit/Delete in dropdown menus**: **Wrap** the menu item
   - **Inline form fields on detail pages**: **Add** `disabled={!canUpdate}`
   - **Status/property selectors**: **Add** `disabled={!canUpdate}`
   - **Bulk action toolbars**: **Wrap** to hide
   - **File upload areas**: **Wrap** to hide
2. **Actions columns** in tables: **Hide the entire column** (header + cells) when user lacks write permission.
3. **No manual role string parsing** (e.g., `role.includes('admin')`) for permission gating — **replace** with `hasPermission()`.
4. **Nav items**: Gate with `canAccessRoute(permissions, 'routeSegment')` from `@/lib/permissions`.
5. **Rail icons** (Compliance, Security, Trust, Settings): Gate by product-level permissions.
6. **Page-level guards**: Every product layout must call `requireRoutePermission('segment', orgId)` from `@/lib/permissions.server`.
7. **Route permissions**: All routes must be defined in `ROUTE_PERMISSIONS` in `apps/app/src/lib/permissions.ts`. Unknown routes default to accessible — this is a security risk.

### Permission Resources
`organization`, `member`, `control`, `evidence`, `policy`, `risk`, `vendor`, `task`, `framework`, `audit`, `finding`, `questionnaire`, `integration`, `apiKey`, `trust`, `pentest`, `app`, `compliance`

### Multi-Product RBAC
- Products (compliance, pen testing) are org-level feature flags — NOT RBAC.
- `app:read` gates compliance dashboard. `pentest:read` gates security product.
- Custom roles can grant access to any product resource. A custom role with only `pentest` permissions should still access the app (handled by `canAccessApp()`).
- Portal-only resources (`policy`, `compliance`) do NOT grant app access.

## Process

1. Read every client component and API controller in the target path
2. Identify all ungated mutation elements and unprotected API endpoints
3. **Fix each issue immediately** by editing the file — add imports, hook calls, and permission gates
4. After all fixes, run `bun run --filter '@comp/app' build` to verify the frontend compiles
5. If API files were changed, also run `npx turbo run typecheck --filter=@comp/api`
6. Report a summary of what was fixed

## Target

$ARGUMENTS
