import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserPermissions } from '@/lib/permissions';

let mockPermissionsState: UserPermissions = {};

const mockHasPermission = vi.fn((resource: string, action: string): boolean => {
  return mockPermissionsState[resource]?.includes(action) ?? false;
});

function setMockPermissions(permissions: UserPermissions): void {
  mockPermissionsState = permissions;
  mockHasPermission.mockImplementation((resource: string, action: string) => {
    return mockPermissionsState[resource]?.includes(action) ?? false;
  });
}

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockFindings = [
  {
    id: 'finding_1',
    status: 'open',
    type: 'soc2',
    content: 'People finding',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const mockMutate = vi.fn();

vi.mock('@/hooks/use-findings-api', () => ({
  useScopeFindings: () => ({
    data: { data: mockFindings },
    isLoading: false,
    error: null,
    mutate: mockMutate,
  }),
  useFindingActions: () => ({
    updateFinding: vi.fn(),
    deleteFinding: vi.fn(),
  }),
}));

vi.mock('@db', () => ({
  FindingStatus: {
    open: 'open',
    needs_revision: 'needs_revision',
    ready_for_review: 'ready_for_review',
    closed: 'closed',
  },
}));


vi.mock('../../../tasks/[taskId]/components/findings/CreateFindingButton', () => ({
  CreateFindingButton: () => <button data-testid="create-finding-btn">Create Finding</button>,
}));

vi.mock('../../../tasks/[taskId]/components/findings/FindingItem', () => ({
  FindingItem: ({ finding }: { finding: { id: string; content: string } }) => (
    <div data-testid={`finding-item-${finding.id}`}>{finding.content}</div>
  ),
}));

import { PeopleFindingsList } from './PeopleFindingsList';

const defaultProps = {
  scope: 'people' as const,
  isAuditor: false,
  isPlatformAdmin: false,
  isAdminOrOwner: false,
  onViewHistory: vi.fn(),
};

describe('PeopleFindingsList permission gating', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('shows Create Finding for platform admin with finding:create', () => {
    setMockPermissions({ finding: ['create', 'read'] });

    render(<PeopleFindingsList {...defaultProps} isPlatformAdmin />);

    expect(screen.getByTestId('create-finding-btn')).toBeInTheDocument();
  });

  it('shows Create Finding for auditor with finding:create', () => {
    setMockPermissions({ finding: ['create', 'read'] });

    render(<PeopleFindingsList {...defaultProps} isAuditor />);

    expect(screen.getByTestId('create-finding-btn')).toBeInTheDocument();
  });

  it('hides Create Finding when user lacks finding:create even if auditor', () => {
    setMockPermissions({ finding: ['read', 'update'] });

    render(<PeopleFindingsList {...defaultProps} isAuditor />);

    expect(screen.queryByTestId('create-finding-btn')).not.toBeInTheDocument();
  });
});
