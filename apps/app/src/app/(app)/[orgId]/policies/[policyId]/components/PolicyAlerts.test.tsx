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
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/org-1/policies/policy-1'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({ orgId: 'org-1', policyId: 'policy-1' })),
}));

// Mock auth-client
vi.mock('@/utils/auth-client', () => ({
  authClient: {
    useActiveMember: () => ({ data: { id: 'member-1' } }),
  },
}));

// Mock usePolicy hook
const mockAcceptChanges = vi.fn();
const mockDenyChanges = vi.fn();
vi.mock('../hooks/usePolicy', () => ({
  usePolicy: () => ({
    acceptChanges: mockAcceptChanges,
    denyChanges: mockDenyChanges,
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: () => 'Jan 1, 2025',
}));

import { PolicyAlerts } from './PolicyAlerts';

const basePolicy = {
  id: 'policy-1',
  name: 'Test Policy',
  organizationId: 'org-1',
  status: 'draft',
  content: null,
  description: null,
  isArchived: false,
  departmentId: null,
  department: null,
  frequency: null,
  approverId: null,
  assigneeId: null,
  currentVersionId: null,
  pendingVersionId: null,
  lastPublishedAt: null,
  reviewDate: null,
  pdfUrl: null,
  displayFormat: 'EDITOR',
  draftContent: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  approver: null,
} as any;

describe('PolicyAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions (policy:update)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders nothing when policy is null', () => {
      const { container } = render(
        <PolicyAlerts policy={null} isPendingApproval={false} />,
      );
      expect(container.innerHTML).toBe('');
    });

    it('renders nothing when not pending and not archived', () => {
      const { container } = render(
        <PolicyAlerts policy={basePolicy} isPendingApproval={false} />,
      );
      expect(container.innerHTML).toBe('');
    });

    it('renders archived alert with Restore button for admin', () => {
      const archivedPolicy = {
        ...basePolicy,
        isArchived: true,
      };
      render(
        <PolicyAlerts policy={archivedPolicy} isPendingApproval={false} />,
      );
      expect(screen.getByText('This policy is archived')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /restore/i }),
      ).toBeInTheDocument();
    });

    it('renders pending approval notice for non-approver', () => {
      const pendingPolicy = {
        ...basePolicy,
        approverId: 'other-member',
        approver: {
          id: 'other-member',
          user: { name: 'Other User', email: 'other@test.com' },
        },
      };
      render(
        <PolicyAlerts policy={pendingPolicy} isPendingApproval={true} />,
      );
      expect(screen.getByText('Pending approval')).toBeInTheDocument();
    });
  });

  describe('auditor permissions (no update)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('renders archived alert without Restore button for auditor', () => {
      const archivedPolicy = {
        ...basePolicy,
        isArchived: true,
      };
      render(
        <PolicyAlerts policy={archivedPolicy} isPendingApproval={false} />,
      );
      expect(screen.getByText('This policy is archived')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /restore/i }),
      ).not.toBeInTheDocument();
    });

    it('still renders pending approval notice for non-approver', () => {
      const pendingPolicy = {
        ...basePolicy,
        approverId: 'other-member',
        approver: {
          id: 'other-member',
          user: { name: 'Other User', email: 'other@test.com' },
        },
      };
      render(
        <PolicyAlerts policy={pendingPolicy} isPendingApproval={true} />,
      );
      expect(screen.getByText('Pending approval')).toBeInTheDocument();
    });
  });
});
