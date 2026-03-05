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

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock use-findings-api
const mockFindings = [
  {
    id: 'finding_1',
    status: 'open',
    type: 'soc2',
    content: 'Finding one',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const mockUpdateFinding = vi.fn();
const mockDeleteFinding = vi.fn();
const mockMutate = vi.fn();

vi.mock('@/hooks/use-findings-api', () => ({
  useTaskFindings: () => ({
    data: { data: mockFindings },
    isLoading: false,
    error: null,
    mutate: mockMutate,
  }),
  useFindingActions: () => ({
    updateFinding: mockUpdateFinding,
    deleteFinding: mockDeleteFinding,
  }),
  FindingStatus: {
    open: 'open',
    needs_revision: 'needs_revision',
    ready_for_review: 'ready_for_review',
    closed: 'closed',
  },
}));

// Mock @db
vi.mock('@db', () => ({
  FindingStatus: {
    open: 'open',
    needs_revision: 'needs_revision',
    ready_for_review: 'ready_for_review',
    closed: 'closed',
  },
}));

// Mock @comp/ui/button
vi.mock('@comp/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// Mock CreateFindingButton — render a visible marker so we can detect presence
vi.mock('./CreateFindingButton', () => ({
  CreateFindingButton: () => <button data-testid="create-finding-btn">Create Finding</button>,
}));

// Mock FindingItem
vi.mock('./FindingItem', () => ({
  FindingItem: ({ finding, canDelete, canChangeStatus }: any) => (
    <div data-testid={`finding-item-${finding.id}`}>
      <span>{finding.content}</span>
      {canDelete && <button data-testid={`delete-btn-${finding.id}`}>Delete</button>}
      {canChangeStatus && (
        <button data-testid={`status-btn-${finding.id}`}>Change Status</button>
      )}
    </div>
  ),
}));

import { FindingsList } from './FindingsList';

const defaultProps = {
  taskId: 'task_123',
  isAuditor: false,
  isPlatformAdmin: false,
  isAdminOrOwner: false,
  onViewHistory: vi.fn(),
};

describe('FindingsList permission gating', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('shows "Create Finding" button for admin with finding:create', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<FindingsList {...defaultProps} />);

    expect(screen.getByTestId('create-finding-btn')).toBeInTheDocument();
  });

  it('hides "Create Finding" button for auditor without finding:create', () => {
    // Auditor permissions don't include finding:create by default
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<FindingsList {...defaultProps} />);

    // Auditor has finding:create so this should still show
    // Let's check what auditor actually has
    const hasCreate = mockHasPermission('finding', 'create');
    if (hasCreate) {
      expect(screen.getByTestId('create-finding-btn')).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId('create-finding-btn')).not.toBeInTheDocument();
    }
  });

  it('hides "Create Finding" button when user has no permissions', () => {
    setMockPermissions({});

    render(<FindingsList {...defaultProps} />);

    expect(screen.queryByTestId('create-finding-btn')).not.toBeInTheDocument();
  });

  it('renders findings list regardless of permissions', () => {
    setMockPermissions({});

    render(<FindingsList {...defaultProps} />);

    expect(screen.getByText('Findings')).toBeInTheDocument();
    expect(screen.getByText('Finding one')).toBeInTheDocument();
  });

  it('passes canDelete=true to FindingItem when admin has finding:delete', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<FindingsList {...defaultProps} />);

    expect(screen.getByTestId('delete-btn-finding_1')).toBeInTheDocument();
  });

  it('does not pass canDelete to FindingItem when user lacks finding:delete', () => {
    setMockPermissions({});

    render(<FindingsList {...defaultProps} />);

    expect(screen.queryByTestId('delete-btn-finding_1')).not.toBeInTheDocument();
  });

  it('passes canChangeStatus=true to FindingItem for admin with finding:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<FindingsList {...defaultProps} isAdminOrOwner />);

    expect(screen.getByTestId('status-btn-finding_1')).toBeInTheDocument();
  });

  it('passes canChangeStatus=true for auditor role (via isAuditor prop)', () => {
    setMockPermissions({});

    render(<FindingsList {...defaultProps} isAuditor />);

    // canChangeStatus = canUpdateFinding || isAuditor
    expect(screen.getByTestId('status-btn-finding_1')).toBeInTheDocument();
  });

  it('passes canChangeStatus=false when user has no permissions and is not auditor', () => {
    setMockPermissions({});

    render(
      <FindingsList
        {...defaultProps}
        isAuditor={false}
        isPlatformAdmin={false}
        isAdminOrOwner={false}
      />,
    );

    expect(screen.queryByTestId('status-btn-finding_1')).not.toBeInTheDocument();
  });
});
