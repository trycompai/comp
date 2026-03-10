---
name: audit-rbac
description: Audit & fix RBAC and audit log compliance in API endpoints and frontend components
---

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
   - **Create/Add buttons**: Wrap with `{hasPermission('resource', 'create') && <Button>...`
   - **Edit/Delete in dropdown menus**: Wrap the menu item
   - **Inline form fields on detail pages**: Add `disabled={!canUpdate}`
   - **Status/property selectors**: Add `disabled={!canUpdate}`
2. **Actions columns** in tables: hide entire column when user lacks write permission.
3. **No manual role string parsing** (`role.includes('admin')`) — use `hasPermission()`.
4. **Nav items**: gate with `canAccessRoute(permissions, 'routeSegment')`.
5. **Page-level**: call `requireRoutePermission('segment', orgId)` server-side.

### Permission Resources
`organization`, `member`, `control`, `evidence`, `policy`, `risk`, `vendor`, `task`, `framework`, `audit`, `finding`, `questionnaire`, `integration`, `apiKey`, `trust`, `pentest`, `app`, `compliance`

### Multi-Product RBAC
- Products (compliance, pen testing) are org-level feature flags — NOT RBAC
- `app:read` gates compliance dashboard; `pentest:read` gates security product
- Custom roles can grant access to any combination of resources
- Portal-only resources (`policy`, `compliance`) do NOT grant app access

## Process
1. Read files specified in `$ARGUMENTS` (or scan the directory)
2. Check each rule above
3. **Fix every violation immediately** — don't just report
4. Run typecheck to verify: `npx turbo run typecheck --filter=@comp/api --filter=@comp/app`
