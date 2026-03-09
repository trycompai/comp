import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
} from '@/test-utils/mocks/permissions';
import { PolicyStatus } from '@db';

// Override next/navigation to include useParams
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/org-1/policies/policy-1'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({ orgId: 'org-1' })),
  redirect: vi.fn(),
}));

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock usePolicyVersions
const mockDeleteVersion = vi.fn();
const mockSubmitForApproval = vi.fn();
vi.mock('../hooks/usePolicyVersions', () => ({
  usePolicyVersions: () => ({
    deleteVersion: mockDeleteVersion,
    submitForApproval: mockSubmitForApproval,
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock SelectAssignee
vi.mock('@/components/SelectAssignee', () => ({
  SelectAssignee: () => <div data-testid="select-assignee" />,
}));

// Mock PublishVersionDialog
vi.mock('./PublishVersionDialog', () => ({
  PublishVersionDialog: () => <div data-testid="publish-version-dialog" />,
}));

// Mock date-fns format to return consistent output
vi.mock('date-fns', () => ({
  format: () => 'Jan 1, 2025 at 12:00 PM',
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  getInitials: (name: string) => name?.charAt(0) || 'U',
}));

import { PolicyVersionsTab } from './PolicyVersionsTab';

const makeVersion = (overrides = {}) => ({
  id: 'ver-1',
  version: 1,
  content: null,
  changelog: null,
  pdfUrl: null,
  policyId: 'policy-1',
  organizationId: 'org-1',
  publishedById: null,
  publishedAt: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  publishedBy: null,
  ...overrides,
});

const makePolicy = (overrides = {}) => ({
  id: 'policy-1',
  name: 'Test Policy',
  organizationId: 'org-1',
  status: PolicyStatus.draft,
  content: null,
  description: null,
  isArchived: false,
  departmentId: null,
  frequency: null,
  approverId: null,
  currentVersionId: 'ver-1',
  pendingVersionId: null,
  lastPublishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  approver: null,
  currentVersion: null,
  ...overrides,
});

const defaultVersions = [makeVersion()] as any[];
const defaultAssignees: any[] = [];

describe('PolicyVersionsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions (full access)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders the Create Version button', () => {
      render(
        <PolicyVersionsTab
          policy={makePolicy() as any}
          versions={defaultVersions}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );

      expect(
        screen.getByRole('button', { name: /create version/i }),
      ).toBeInTheDocument();
    });

    it('renders the Version History heading', () => {
      render(
        <PolicyVersionsTab
          policy={makePolicy() as any}
          versions={defaultVersions}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );

      expect(screen.getByText('Version History')).toBeInTheDocument();
    });

    it('renders version items in the list', () => {
      render(
        <PolicyVersionsTab
          policy={makePolicy() as any}
          versions={defaultVersions}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );

      expect(screen.getByText('v1')).toBeInTheDocument();
    });

    it('renders a dropdown trigger (not a plain View button) for versions', () => {
      render(
        <PolicyVersionsTab
          policy={makePolicy() as any}
          versions={defaultVersions}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );

      // Admin should get a dropdown menu trigger, not just a "View" button
      // The dropdown trigger does NOT have "View" text
      const viewButtons = screen.queryAllByRole('button', { name: /^view$/i });
      // There should be no standalone "View" button; instead there's a dropdown trigger
      expect(viewButtons).toHaveLength(0);
    });
  });

  describe('auditor permissions (read only)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('does not render the Create Version button', () => {
      render(
        <PolicyVersionsTab
          policy={makePolicy() as any}
          versions={defaultVersions}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );

      expect(
        screen.queryByRole('button', { name: /create version/i }),
      ).not.toBeInTheDocument();
    });

    it('renders a View button instead of dropdown for read-only user', () => {
      render(
        <PolicyVersionsTab
          policy={makePolicy() as any}
          versions={defaultVersions}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );

      // The read-only path shows a plain "View" button
      expect(
        screen.getByRole('button', { name: /view/i }),
      ).toBeInTheDocument();
    });

    it('still renders the version list', () => {
      render(
        <PolicyVersionsTab
          policy={makePolicy() as any}
          versions={defaultVersions}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );

      expect(screen.getByText('v1')).toBeInTheDocument();
      expect(screen.getByText('Version History')).toBeInTheDocument();
    });
  });

  describe('update-only permissions (no publish, no delete)', () => {
    beforeEach(() => {
      setMockPermissions({
        policy: ['read', 'update'],
      });
    });

    it('renders Create Version button with policy:update', () => {
      render(
        <PolicyVersionsTab
          policy={makePolicy() as any}
          versions={defaultVersions}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );

      expect(
        screen.getByRole('button', { name: /create version/i }),
      ).toBeInTheDocument();
    });

    it('renders a dropdown (because canUpdatePolicy is true)', () => {
      // With canUpdatePolicy=true, even without publish/delete, the dropdown renders
      const nonCurrentVersion = makeVersion({
        id: 'ver-2',
        version: 2,
      });

      render(
        <PolicyVersionsTab
          policy={makePolicy({ currentVersionId: 'ver-1' }) as any}
          versions={[makeVersion(), nonCurrentVersion] as any[]}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );

      // No standalone "View" buttons since dropdown renders for update permission
      const viewButtons = screen.queryAllByRole('button', { name: /^view$/i });
      expect(viewButtons).toHaveLength(0);
    });
  });

  describe('empty versions', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('shows empty state when no versions exist', () => {
      render(
        <PolicyVersionsTab
          policy={makePolicy() as any}
          versions={[]}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );

      expect(screen.getByText('No versions yet')).toBeInTheDocument();
    });
  });
});
