# Audit & Fix RBAC / Audit Logs

Audit the specified files or directories for RBAC and audit log compliance. **Fix every issue found immediately.**

## Rules

### API Endpoints (NestJS — `apps/api/src/`)
1. **Every mutation endpoint** (POST, PATCH, PUT, DELETE) MUST have `@RequirePermission('resource', 'action')`. If missing, **add it**.
2. **Read endpoints** (GET) should have `@RequirePermission('resource', 'read')`. If missing, **add it**.
3. **Self-endpoints** (e.g., `/me/preferences`) may skip `@RequirePermission` — authentication via `HybridAuthGuard` is sufficient.
4. **Controller format**: Must use `@Controller({ path: 'name', version: '1' })`, NOT `@Controller('v1/name')`. If wrong, **fix it**.

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
4. **Permission resources**: `organization`, `member`, `control`, `evidence`, `policy`, `risk`, `vendor`, `task`, `framework`, `audit`, `finding`, `questionnaire`, `integration`, `apiKey`, `trust`, `app`

## Process

1. Read every client component and API controller in the target path
2. Identify all ungated mutation elements and unprotected API endpoints
3. **Fix each issue immediately** by editing the file — add imports, hook calls, and permission gates
4. After all fixes, run `bun run --filter '@comp/app' build` to verify the frontend compiles
5. If API files were changed, also run `npx turbo run typecheck --filter=@comp/api`
6. Report a summary of what was fixed

## Target

$ARGUMENTS
