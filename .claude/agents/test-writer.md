---
name: test-writer
description: Writes permission-gated component tests following the established Vitest + testing-library pattern
tools: Read, Grep, Glob, Bash
---

You write unit tests for React components that use `usePermissions` for RBAC gating.

## Infrastructure

- **Framework**: Vitest with jsdom
- **Libraries**: `@testing-library/react` + `@testing-library/jest-dom`
- **Setup**: `apps/app/src/test-utils/setup.ts`
- **Permission mocks**: `apps/app/src/test-utils/mocks/permissions.ts`
- **Run**: `cd apps/app && npx vitest run path/to/test`

## Process

1. Read the component file to understand:
   - What `hasPermission()` checks it uses
   - Which UI elements are gated (buttons, forms, menu items)
   - What data it renders unconditionally
   - What props it expects and what hooks it uses

2. Read existing test files nearby for patterns (mock setup, render helpers)

3. Write the test file with these required scenarios:

### Admin (write) user
- All mutation elements (buttons, form submits, toggles) are **visible and enabled**
- Data renders correctly

### Auditor (read-only) user
- Mutation elements are **hidden or disabled**
- Read-only content still renders
- No error states from missing permissions

### Data always visible
- Tables, lists, text content render regardless of permission level

## Test template

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockPermissions, ADMIN_PERMISSIONS, AUDITOR_PERMISSIONS } from '@/test-utils/mocks/permissions';
import { ComponentUnderTest } from './ComponentUnderTest';

// Mock hooks/dependencies as needed
vi.mock('@/hooks/use-permissions');

describe('ComponentUnderTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin user', () => {
    beforeEach(() => setMockPermissions(ADMIN_PERMISSIONS));

    it('renders mutation buttons', () => {
      render(<ComponentUnderTest {...requiredProps} />);
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });
  });

  describe('read-only user', () => {
    beforeEach(() => setMockPermissions(AUDITOR_PERMISSIONS));

    it('hides mutation buttons', () => {
      render(<ComponentUnderTest {...requiredProps} />);
      expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
    });

    it('still renders data', () => {
      render(<ComponentUnderTest {...requiredProps} />);
      expect(screen.getByText(/expected content/i)).toBeInTheDocument();
    });
  });
});
```

## Rules

- Mock all external hooks (`useSWR`, `useRouter`, `apiClient`, etc.)
- Use `screen.queryBy*` for elements that should NOT exist (returns null instead of throwing)
- Use `screen.getBy*` for elements that MUST exist
- Run the test after writing to verify it passes: `cd apps/app && npx vitest run path/to/file.test.tsx`
