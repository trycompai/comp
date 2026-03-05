# Audit & Fix Unit Tests

Check that unit tests exist and pass for components with permission gating. **Write missing tests and fix failing ones.**

## Test Infrastructure
- **Framework**: Vitest with jsdom (`apps/app/vitest.config.mts`)
- **Component testing**: `@testing-library/react` + `@testing-library/jest-dom`
- **Setup**: `apps/app/src/test-utils/setup.ts` (mocks next/navigation)
- **Permission mocks**: `apps/app/src/test-utils/mocks/permissions.ts`
- **Run**: `cd apps/app && npx vitest run`

## Required Test Pattern

Every component that imports `usePermissions` MUST have a test file verifying:

1. **Admin (write) user**: Mutation elements visible/enabled
2. **Auditor (read-only) user**: Mutation elements hidden/disabled
3. **Data always visible**: Read-only content renders regardless of permissions

Use this mock pattern:
```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setMockPermissions, ADMIN_PERMISSIONS, AUDITOR_PERMISSIONS, mockHasPermission } from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock all other hooks/dependencies the component uses

describe('ComponentName', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows mutation button for admin', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<Component />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('hides mutation button for read-only user', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<Component />);
    expect(screen.queryByText('Create')).not.toBeInTheDocument();
  });
});
```

## Process

1. Find all components in the target path that import `usePermissions`
2. Check if each has a `.test.tsx` file
3. **If missing**: Write the test file with admin vs read-only permission tests
4. **If exists**: Run it — if failing, read the test and component to understand and fix
5. After all fixes, run `cd apps/app && npx vitest run` to verify all pass
6. Report: total tests, passing, failing, newly written

## Target

$ARGUMENTS
