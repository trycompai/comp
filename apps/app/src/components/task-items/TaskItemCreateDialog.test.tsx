import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock TaskItemForm
vi.mock('./TaskItemForm', () => ({
  TaskItemForm: () => <div data-testid="task-item-form">Task Item Form</div>,
}));

import { TaskItemCreateDialog } from './TaskItemCreateDialog';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  entityId: 'entity_1',
  entityType: 'vendor' as const,
  page: 1,
  limit: 5,
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
  filters: {},
  onSuccess: vi.fn(),
};

describe('TaskItemCreateDialog permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when user lacks task:create permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    const { container } = render(<TaskItemCreateDialog {...defaultProps} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when user has no permissions', () => {
    setMockPermissions({});

    const { container } = render(<TaskItemCreateDialog {...defaultProps} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders the dialog when user has task:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TaskItemCreateDialog {...defaultProps} />);

    expect(screen.getByText('Create task')).toBeInTheDocument();
  });

  it('renders the TaskItemForm when user has task:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TaskItemCreateDialog {...defaultProps} />);

    expect(screen.getByTestId('task-item-form')).toBeInTheDocument();
  });

  it('does not render TaskItemForm when user lacks permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<TaskItemCreateDialog {...defaultProps} />);

    expect(screen.queryByTestId('task-item-form')).not.toBeInTheDocument();
  });
});
