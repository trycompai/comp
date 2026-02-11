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

// Mock useOptimisticTaskItems
vi.mock('@/hooks/use-task-items', () => ({
  useOptimisticTaskItems: () => ({
    optimisticUpdate: vi.fn(),
    optimisticDelete: vi.fn(),
  }),
}));

// Mock useAssignableMembers
vi.mock('@/hooks/use-organization-members', () => ({
  useAssignableMembers: () => ({
    members: [],
  }),
}));

// Mock filterMembersByOwnerOrAdmin
vi.mock('@/utils/filter-members-by-role', () => ({
  filterMembersByOwnerOrAdmin: () => [],
}));

// Mock child components
vi.mock('./TaskItemDescriptionView', () => ({
  TaskItemDescriptionView: ({ description }: { description: string }) => (
    <div data-testid="description-view">{description}</div>
  ),
}));

vi.mock('./verify-risk-assessment/VerifyRiskAssessmentTaskItemSkeletonRow', () => ({
  VerifyRiskAssessmentTaskItemSkeletonRow: () => <div data-testid="skeleton-row" />,
}));

vi.mock('@/components/SelectAssignee', () => ({
  SelectAssignee: () => <div data-testid="select-assignee" />,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: () => 'Jan 1',
}));

// Mock @comp/ui components
vi.mock('@comp/ui/avatar', () => ({
  Avatar: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: () => null,
}));

vi.mock('@comp/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
    'aria-label'?: string;
    onMouseDown?: (e: React.MouseEvent) => void;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={props['aria-label']} data-variant={props.variant}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@comp/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({
    children,
    disabled,
    asChild,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    asChild?: boolean;
  }) => <div data-disabled={disabled}>{children}</div>,
}));

vi.mock('@comp/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@comp/ui/label', () => ({
  Label: ({ children, ...props }: { children: React.ReactNode }) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock('@comp/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

vi.mock('@comp/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Pencil: () => <span data-testid="pencil-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  List: () => null,
  Clock3: () => <span data-testid="clock-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  CheckCircle2: () => <span data-testid="check-icon" />,
  XCircle: () => <span data-testid="x-icon" />,
  AlertTriangle: () => <span data-testid="alert-icon" />,
  TrendingUp: () => <span data-testid="trending-icon" />,
  Gauge: () => <span data-testid="gauge-icon" />,
  ArrowDownRight: () => <span data-testid="arrow-icon" />,
  UserPlus: () => null,
  Loader2: () => <span data-testid="loader-icon" />,
  ChevronDown: () => <span data-testid="chevron-icon" />,
  Circle: () => <span data-testid="circle-icon" />,
}));

import { TaskItemItem } from './TaskItemItem';

const mockTaskItem = {
  id: 'tski_abc123def456',
  title: 'Test Task Item',
  description: 'Test description',
  status: 'todo' as const,
  priority: 'medium' as const,
  entityId: 'entity_1',
  entityType: 'vendor' as const,
  assignee: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: {
    id: 'member_1',
    user: { id: 'user_1', name: 'Creator', email: 'creator@test.com', image: null },
  },
  updatedBy: null,
};

const defaultProps = {
  taskItem: mockTaskItem,
  entityId: 'entity_1',
  entityType: 'vendor' as const,
};

describe('TaskItemItem permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows delete button when user has task:delete permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TaskItemItem {...defaultProps} />);

    expect(screen.getByLabelText('Delete task')).toBeInTheDocument();
  });

  it('hides delete button when user lacks task:delete permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<TaskItemItem {...defaultProps} />);

    expect(screen.queryByLabelText('Delete task')).not.toBeInTheDocument();
  });

  it('shows edit button in expanded view when user has task:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TaskItemItem {...defaultProps} isExpanded={true} onToggleExpanded={vi.fn()} />);

    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('hides edit button in expanded view when user lacks task:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<TaskItemItem {...defaultProps} isExpanded={true} onToggleExpanded={vi.fn()} />);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('enables status dropdown trigger when user has task:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TaskItemItem {...defaultProps} />);

    const statusButton = screen.getByTitle(/Status: todo/);
    expect(statusButton).not.toBeDisabled();
  });

  it('disables status dropdown trigger when user lacks task:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<TaskItemItem {...defaultProps} />);

    const statusButton = screen.getByTitle(/Status: todo/);
    expect(statusButton).toBeDisabled();
  });

  it('enables priority dropdown trigger when user has task:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TaskItemItem {...defaultProps} />);

    const priorityButton = screen.getByTitle(/Priority: medium/);
    expect(priorityButton).not.toBeDisabled();
  });

  it('disables priority dropdown trigger when user lacks task:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<TaskItemItem {...defaultProps} />);

    const priorityButton = screen.getByTitle(/Priority: medium/);
    expect(priorityButton).toBeDisabled();
  });

  it('renders task title regardless of permissions', () => {
    setMockPermissions({});

    render(<TaskItemItem {...defaultProps} />);

    expect(screen.getByText('Test Task Item')).toBeInTheDocument();
  });
});
