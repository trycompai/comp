import {
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
  setMockPermissions,
} from '@/test-utils/mocks/permissions';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

interface MockApprovalBannerProps {
  approveConfirmation?: { content?: ReactNode };
  approveLoading?: boolean;
  description: string;
  onApprove: () => void;
  onReject: () => void;
  rejectLoading?: boolean;
  title: string;
}

type MockButtonProps = ComponentProps<'button'> & {
  iconLeft?: ReactNode;
  size?: string;
  variant?: string;
};

interface MockLayoutProps {
  children: ReactNode;
}

type MockTextProps = MockLayoutProps & {
  as?: string;
  leading?: string;
  size?: string;
  variant?: string;
  weight?: string;
};

vi.mock('@trycompai/design-system', async () => {
  const { forwardRef } = await import('react');

  return {
    ApprovalBanner: ({
      approveConfirmation,
      approveLoading,
      description,
      onApprove,
      onReject,
      rejectLoading,
      title,
    }: MockApprovalBannerProps) => (
      <div>
        <div>{title}</div>
        <div>{description}</div>
        {approveConfirmation?.content}
        <button disabled={approveLoading} onClick={onApprove}>
          Approve
        </button>
        <button disabled={rejectLoading} onClick={onReject}>
          Reject
        </button>
      </div>
    ),
    Button: ({ children, iconLeft, ...props }: MockButtonProps) => (
      <button {...props}>
        {iconLeft}
        {children}
      </button>
    ),
    HStack: ({ children }: MockLayoutProps) => <div>{children}</div>,
    Label: ({ children, ...props }: ComponentProps<'label'>) => (
      <label {...props}>{children}</label>
    ),
    Stack: ({ children }: MockLayoutProps) => <div>{children}</div>,
    Text: ({ children }: MockTextProps) => <span>{children}</span>,
    Textarea: forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'>>((props, ref) => (
      <textarea ref={ref} {...props} />
    )),
  };
});

vi.mock('@/components/policies/PolicyAcknowledgmentInvalidationDialog', () => ({
  getPolicyAcknowledgmentCount: (policy?: { signedBy?: string[] } | null) =>
    policy?.signedBy?.length ?? 0,
  PolicyAcknowledgmentInvalidationDialog: ({
    acknowledgmentCount,
    onConfirm,
    open,
  }: {
    acknowledgmentCount: number;
    onConfirm: () => void;
    open: boolean;
  }) =>
    open ? (
      <div data-testid="acknowledgment-dialog">
        <span>{acknowledgmentCount}</span>
        <button onClick={onConfirm}>Publish and invalidate</button>
      </div>
    ) : null,
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
  signedBy: [],
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
      const { container } = render(<PolicyAlerts policy={null} isPendingApproval={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders nothing when not pending and not archived', () => {
      const { container } = render(<PolicyAlerts policy={basePolicy} isPendingApproval={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders archived alert with Restore button for admin', () => {
      const archivedPolicy = {
        ...basePolicy,
        isArchived: true,
      };
      render(<PolicyAlerts policy={archivedPolicy} isPendingApproval={false} />);
      expect(screen.getByText('This policy is archived')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument();
    });

    it('renders pending approval notice for non-approver', () => {
      const pendingPolicy = {
        ...basePolicy,
        approverId: 'other-member',
        pendingVersionId: 'ver-1',
        approver: {
          id: 'other-member',
          user: { name: 'Other User', email: 'other@test.com' },
        },
      };
      render(<PolicyAlerts policy={pendingPolicy} isPendingApproval={true} />);
      expect(screen.getByText('Pending approval')).toBeInTheDocument();
    });

    it('does not render pending approval notice when pendingVersionId is null (stale approverId)', () => {
      const stalePolicy = {
        ...basePolicy,
        approverId: 'other-member',
        pendingVersionId: null,
        approver: {
          id: 'other-member',
          user: { name: 'Other User', email: 'other@test.com' },
        },
      };
      const { container } = render(<PolicyAlerts policy={stalePolicy} isPendingApproval={true} />);
      expect(container.innerHTML).toBe('');
    });

    it('warns approver before accepting changes that invalidate acknowledgments', async () => {
      const user = userEvent.setup();
      const pendingPolicy = {
        ...basePolicy,
        approverId: 'member-1',
        pendingVersionId: 'ver-1',
        signedBy: ['user-1', 'user-2'],
        approver: {
          id: 'member-1',
          user: { name: 'Current User', email: 'current@test.com' },
        },
      };

      render(<PolicyAlerts policy={pendingPolicy} isPendingApproval={true} />);

      await user.click(screen.getByRole('button', { name: 'Approve' }));

      expect(screen.getByTestId('acknowledgment-dialog')).toHaveTextContent('2');
      expect(mockAcceptChanges).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: /publish and invalidate/i }));

      expect(mockAcceptChanges).toHaveBeenCalledWith({
        approverId: 'member-1',
        comment: undefined,
      });
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
      render(<PolicyAlerts policy={archivedPolicy} isPendingApproval={false} />);
      expect(screen.getByText('This policy is archived')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /restore/i })).not.toBeInTheDocument();
    });
  });
});
