import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ orgId: 'org-1', policyId: 'policy-1' })),
}));

// Mock usePolicy hook
const mockAddControlMappings = vi.fn();
const mockRemoveControlMapping = vi.fn();
vi.mock('../hooks/usePolicy', () => ({
  usePolicy: () => ({
    addControlMappings: mockAddControlMappings,
    removeControlMapping: mockRemoveControlMapping,
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock SelectPills
vi.mock('@comp/ui/select-pills', () => ({
  SelectPills: ({
    disabled,
    placeholder,
  }: {
    disabled: boolean;
    placeholder: string;
  }) => (
    <div data-testid="select-pills" data-disabled={disabled}>
      {placeholder}
    </div>
  ),
}));

import { PolicyControlMappings } from './PolicyControlMappings';

const allControls = [
  { id: 'ctrl-1', name: 'Control A' },
  { id: 'ctrl-2', name: 'Control B' },
] as any[];

const mappedControls = [{ id: 'ctrl-1', name: 'Control A' }] as any[];

describe('PolicyControlMappings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions (policy:update)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders the section title', () => {
      render(
        <PolicyControlMappings
          mappedControls={mappedControls}
          allControls={allControls}
          isPendingApproval={false}
        />,
      );
      expect(screen.getByText('Map Controls')).toBeInTheDocument();
    });

    it('renders SelectPills as enabled for admin', () => {
      render(
        <PolicyControlMappings
          mappedControls={mappedControls}
          allControls={allControls}
          isPendingApproval={false}
        />,
      );
      const pills = screen.getByTestId('select-pills');
      expect(pills.getAttribute('data-disabled')).toBe('false');
    });

    it('disables SelectPills when pending approval even for admin', () => {
      render(
        <PolicyControlMappings
          mappedControls={mappedControls}
          allControls={allControls}
          isPendingApproval={true}
        />,
      );
      const pills = screen.getByTestId('select-pills');
      expect(pills.getAttribute('data-disabled')).toBe('true');
    });
  });

  describe('auditor permissions (no update)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('renders SelectPills as disabled for auditor', () => {
      render(
        <PolicyControlMappings
          mappedControls={mappedControls}
          allControls={allControls}
          isPendingApproval={false}
        />,
      );
      const pills = screen.getByTestId('select-pills');
      expect(pills.getAttribute('data-disabled')).toBe('true');
    });

    it('still renders the section title for auditor', () => {
      render(
        <PolicyControlMappings
          mappedControls={mappedControls}
          allControls={allControls}
          isPendingApproval={false}
        />,
      );
      expect(screen.getByText('Map Controls')).toBeInTheDocument();
    });
  });
});
