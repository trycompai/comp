import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock @comp/ui components
vi.mock('@comp/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className: _c,
    variant: _v,
    size: _s,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    'aria-label': ariaLabel,
  }: {
    checked: boolean | 'indeterminate';
    onCheckedChange: (checked: boolean | 'indeterminate') => void;
    'aria-label'?: string;
  }) => (
    <input
      type="checkbox"
      checked={checked === true}
      onChange={(e) => onCheckedChange(e.target.checked)}
      aria-label={ariaLabel}
    />
  ),
}));

// Mock child components
vi.mock('./BulkTaskAssigneeChangeModal', () => ({
  BulkTaskAssigneeChangeModal: () => (
    <div data-testid="bulk-assignee-modal" />
  ),
}));

vi.mock('./BulkTaskDeleteModal', () => ({
  BulkTaskDeleteModal: () => <div data-testid="bulk-delete-modal" />,
}));

vi.mock('./BulkTaskStatusChangeModal', () => ({
  BulkTaskStatusChangeModal: () => <div data-testid="bulk-status-modal" />,
}));

vi.mock('./ModernTaskListItem', () => ({
  ModernTaskListItem: ({ task }: { task: { id: string; title: string } }) => (
    <div data-testid={`task-item-${task.id}`}>{task.title}</div>
  ),
}));

vi.mock('./TaskBulkActions', () => ({
  TaskBulkActions: ({
    isEditing,
    onEdit,
  }: {
    isEditing: boolean;
    onEdit: (v: boolean) => void;
  }) => (
    <div data-testid="task-bulk-actions">
      <button
        data-testid="toggle-edit-btn"
        onClick={() => onEdit(!isEditing)}
      >
        {isEditing ? 'Cancel Edit' : 'Edit'}
      </button>
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  RefreshCw: ({ className: _c }: { className?: string }) => (
    <span data-testid="refresh-icon" />
  ),
  Trash2: ({ className: _c }: { className?: string }) => (
    <span data-testid="trash-icon" />
  ),
  User: ({ className: _c }: { className?: string }) => (
    <span data-testid="user-icon" />
  ),
}));

import { ModernSingleStatusTaskList } from './ModernSingleStatusTaskList';

const MockIcon = ({ className: _c }: { className?: string }) => (
  <span data-testid="status-icon" />
);

const mockTasks = [
  {
    id: 'task-1',
    title: 'Test Task 1',
    description: 'A test task',
    status: 'todo',
    assigneeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId: 'org_1',
    controls: [],
  },
  {
    id: 'task-2',
    title: 'Test Task 2',
    description: 'Another test task',
    status: 'todo',
    assigneeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId: 'org_1',
    controls: [],
  },
];

const defaultProps = {
  config: {
    icon: MockIcon,
    label: 'To Do',
    color: 'text-gray-500',
  },
  tasks: mockTasks as typeof mockTasks &
    {
      controls: { id: string; name: string }[];
    }[],
  members: [],
  handleTaskClick: vi.fn(),
  evidenceApprovalEnabled: false,
};

describe('ModernSingleStatusTaskList permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always renders task items regardless of permissions', () => {
    setMockPermissions({});
    render(<ModernSingleStatusTaskList {...defaultProps} />);
    expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument();
  });

  it('always shows status label regardless of permissions', () => {
    setMockPermissions({});
    render(<ModernSingleStatusTaskList {...defaultProps} />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('shows bulk Status and Assignee buttons for admin when in edit mode', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const user = userEvent.setup();
    render(<ModernSingleStatusTaskList {...defaultProps} />);

    // Enter edit mode
    await user.click(screen.getByTestId('toggle-edit-btn'));

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
  });

  it('shows bulk Delete button for admin when in edit mode', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const user = userEvent.setup();
    render(<ModernSingleStatusTaskList {...defaultProps} />);

    // Enter edit mode
    await user.click(screen.getByTestId('toggle-edit-btn'));

    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('hides bulk Status and Assignee buttons for auditor when in edit mode', async () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    const user = userEvent.setup();
    render(<ModernSingleStatusTaskList {...defaultProps} />);

    // Enter edit mode
    await user.click(screen.getByTestId('toggle-edit-btn'));

    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Assignee')).not.toBeInTheDocument();
  });

  it('hides bulk Delete button for auditor when in edit mode', async () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    const user = userEvent.setup();
    render(<ModernSingleStatusTaskList {...defaultProps} />);

    // Enter edit mode
    await user.click(screen.getByTestId('toggle-edit-btn'));

    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('hides all bulk action buttons when user has no permissions', async () => {
    setMockPermissions({});
    const user = userEvent.setup();
    render(<ModernSingleStatusTaskList {...defaultProps} />);

    // Enter edit mode
    await user.click(screen.getByTestId('toggle-edit-btn'));

    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Assignee')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows Delete but not Status/Assignee with only task:delete permission', async () => {
    setMockPermissions({ task: ['delete'] });
    const user = userEvent.setup();
    render(<ModernSingleStatusTaskList {...defaultProps} />);

    // Enter edit mode
    await user.click(screen.getByTestId('toggle-edit-btn'));

    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Assignee')).not.toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows Status/Assignee but not Delete with only task:update permission', async () => {
    setMockPermissions({ task: ['update'] });
    const user = userEvent.setup();
    render(<ModernSingleStatusTaskList {...defaultProps} />);

    // Enter edit mode
    await user.click(screen.getByTestId('toggle-edit-btn'));

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});
