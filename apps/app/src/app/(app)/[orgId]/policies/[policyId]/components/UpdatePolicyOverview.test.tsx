import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
} from '@/test-utils/mocks/permissions';
import { Departments, Frequency, PolicyStatus } from '@db';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ orgId: 'org-1' })),
}));

// Mock usePolicy hook
const mockUpdatePolicy = vi.fn();
vi.mock('../hooks/usePolicy', () => ({
  usePolicy: () => ({
    updatePolicy: mockUpdatePolicy,
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: () => 'Jan 1, 2025',
}));

// Mock SelectAssignee
vi.mock('@/components/SelectAssignee', () => ({
  SelectAssignee: ({
    disabled,
  }: {
    disabled: boolean;
  }) => <div data-testid="select-assignee" data-disabled={disabled} />,
}));

import { UpdatePolicyOverview } from './UpdatePolicyOverview';

const basePolicy = {
  id: 'policy-1',
  name: 'Test Policy',
  organizationId: 'org-1',
  status: PolicyStatus.draft,
  content: null,
  description: null,
  isArchived: false,
  departmentId: null,
  department: Departments.admin,
  frequency: Frequency.monthly,
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
  currentVersion: null,
} as any;

const defaultAssignees: any[] = [];

describe('UpdatePolicyOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions (policy:update)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders the form fields', () => {
      render(
        <UpdatePolicyOverview
          policy={basePolicy}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );
      expect(screen.getByText('Review Frequency')).toBeInTheDocument();
      expect(screen.getByText('Department')).toBeInTheDocument();
      expect(screen.getByText('Assignee')).toBeInTheDocument();
      expect(screen.getByText('Review Date')).toBeInTheDocument();
    });

    it('renders the Save button for admin', () => {
      render(
        <UpdatePolicyOverview
          policy={basePolicy}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );
      expect(
        screen.getByRole('button', { name: /save/i }),
      ).toBeInTheDocument();
    });

    it('hides the Save button when pending approval even for admin', () => {
      render(
        <UpdatePolicyOverview
          policy={basePolicy}
          assignees={defaultAssignees}
          isPendingApproval={true}
        />,
      );
      expect(
        screen.queryByRole('button', { name: /save/i }),
      ).not.toBeInTheDocument();
    });

    it('renders the assignee selector as enabled', () => {
      render(
        <UpdatePolicyOverview
          policy={basePolicy}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );
      const assigneeSelector = screen.getByTestId('select-assignee');
      expect(assigneeSelector.getAttribute('data-disabled')).toBe('false');
    });
  });

  describe('auditor permissions (no update)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('does not render the Save button for auditor', () => {
      render(
        <UpdatePolicyOverview
          policy={basePolicy}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );
      expect(
        screen.queryByRole('button', { name: /save/i }),
      ).not.toBeInTheDocument();
    });

    it('renders form fields as read-only (assignee selector disabled)', () => {
      render(
        <UpdatePolicyOverview
          policy={basePolicy}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );
      const assigneeSelector = screen.getByTestId('select-assignee');
      expect(assigneeSelector.getAttribute('data-disabled')).toBe('true');
    });

    it('still renders the form field labels', () => {
      render(
        <UpdatePolicyOverview
          policy={basePolicy}
          assignees={defaultAssignees}
          isPendingApproval={false}
        />,
      );
      expect(screen.getByText('Review Frequency')).toBeInTheDocument();
      expect(screen.getByText('Department')).toBeInTheDocument();
    });
  });
});
