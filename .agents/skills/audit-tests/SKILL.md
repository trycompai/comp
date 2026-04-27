---
name: audit-tests
description: Audit & fix unit tests for permission-gated components
---

Check that unit tests exist and pass for permission-gated components. **Write missing tests immediately.**

## Infrastructure
- **Framework**: Vitest with jsdom
- **Component testing**: `@testing-library/react` + `@testing-library/jest-dom`
- **Setup**: `apps/app/src/test-utils/setup.ts`
- **Permission mocks**: `apps/app/src/test-utils/mocks/permissions.ts`
- **Run**: `cd apps/app && npx vitest run`

## Required Test Pattern

Every component importing `usePermissions` MUST have tests covering:

1. **Admin (write) user**: mutation elements visible/enabled
2. **Auditor (read-only)**: mutation elements hidden/disabled
3. **Data always visible**: read-only content renders regardless of permissions

Use `setMockPermissions`, `ADMIN_PERMISSIONS`, `AUDITOR_PERMISSIONS` from test utils.

## Process
1. Find components with `usePermissions` in `$ARGUMENTS`
2. Check for corresponding `.test.tsx` files
3. Write missing tests following the pattern above
4. Fix any failing tests
5. Run: `cd apps/app && npx vitest run`
