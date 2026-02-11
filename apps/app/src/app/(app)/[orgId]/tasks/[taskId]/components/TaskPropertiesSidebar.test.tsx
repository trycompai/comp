import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
} from '@/test-utils/mocks/permissions';

// Add useParams to the global next/navigation mock
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ orgId: 'org_123', taskId: 'task_123' })),
  };
});

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock useTask hook
const mockTask = {
  id: 'task_123',
  title: 'Test Task',
  status: 'open',
  assigneeId: null,
  frequency: null,
  department: null,
  reviewDate: null,
  controls: [],
};

vi.mock('../hooks/use-task', () => ({
  useTask: () => ({
    task: mockTask,
    isLoading: false,
  }),
}));

// Mock useAssignableMembers
vi.mock('@/hooks/use-organization-members', () => ({
  useAssignableMembers: () => ({
    members: [
      {
        id: 'member_1',
        user: { id: 'user_1', name: 'Test User', email: 'test@example.com', image: null },
      },
    ],
  }),
}));

// Track disabled prop values passed to PropertySelector
const propertySelectorCalls: Array<{ label: string; disabled: boolean }> = [];

vi.mock('./PropertySelector', () => ({
  PropertySelector: ({ disabled, trigger, value }: { disabled?: boolean; trigger: React.ReactNode; value?: string | null }) => {
    // We capture the disabled prop by rendering it as a data attribute
    return (
      <div data-testid="property-selector" data-disabled={disabled ? 'true' : 'false'}>
        {trigger}
      </div>
    );
  },
}));

vi.mock('./constants', () => ({
  DEPARTMENT_COLORS: { none: '#888' },
  taskDepartments: ['none'],
  taskFrequencies: ['daily', 'weekly'],
  taskStatuses: ['open', 'done'],
}));

vi.mock('../../components/TaskStatusIndicator', () => ({
  TaskStatusIndicator: ({ status }: { status: string }) => (
    <span data-testid="status-indicator">{status}</span>
  ),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date, fmt: string) => '1/1/2024',
}));

// Mock @comp/ui components
vi.mock('@comp/ui/avatar', () => ({
  Avatar: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
    <div {...props}>{children}</div>
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: () => null,
}));

vi.mock('@comp/ui/badge', () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode }) => (
    <span {...props}>{children}</span>
  ),
}));

vi.mock('@comp/ui/button', () => ({
  Button: ({
    children,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    variant?: string;
    className?: string;
  }) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

import { TaskPropertiesSidebar } from './TaskPropertiesSidebar';

const defaultProps = {
  handleUpdateTask: vi.fn(),
  initialMembers: [],
};

describe('TaskPropertiesSidebar permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    propertySelectorCalls.length = 0;
  });

  it('enables all PropertySelectors when user has task:update and task:assign', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TaskPropertiesSidebar {...defaultProps} />);

    const selectors = screen.getAllByTestId('property-selector');
    // Status, Assignee, Frequency, Department = 4 selectors
    expect(selectors.length).toBe(4);

    // Status selector should be enabled (canUpdate = true)
    expect(selectors[0]).toHaveAttribute('data-disabled', 'false');
    // Assignee selector should be enabled (canAssign = true)
    expect(selectors[1]).toHaveAttribute('data-disabled', 'false');
    // Frequency selector should be enabled (canUpdate = true)
    expect(selectors[2]).toHaveAttribute('data-disabled', 'false');
    // Department selector should be enabled (canUpdate = true)
    expect(selectors[3]).toHaveAttribute('data-disabled', 'false');
  });

  it('disables status, frequency, and department selectors when user lacks task:update', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<TaskPropertiesSidebar {...defaultProps} />);

    const selectors = screen.getAllByTestId('property-selector');

    // Status selector disabled (no task:update)
    expect(selectors[0]).toHaveAttribute('data-disabled', 'true');
    // Assignee selector disabled (no task:assign)
    expect(selectors[1]).toHaveAttribute('data-disabled', 'true');
    // Frequency selector disabled (no task:update)
    expect(selectors[2]).toHaveAttribute('data-disabled', 'true');
    // Department selector disabled (no task:update)
    expect(selectors[3]).toHaveAttribute('data-disabled', 'true');
  });

  it('disables assignee selector specifically when user lacks task:assign', () => {
    // Has task:update but NOT task:assign
    setMockPermissions({ task: ['read', 'update'] });

    render(<TaskPropertiesSidebar {...defaultProps} />);

    const selectors = screen.getAllByTestId('property-selector');

    // Status selector should be enabled (has task:update)
    expect(selectors[0]).toHaveAttribute('data-disabled', 'false');
    // Assignee selector should be disabled (no task:assign)
    expect(selectors[1]).toHaveAttribute('data-disabled', 'true');
    // Frequency selector should be enabled (has task:update)
    expect(selectors[2]).toHaveAttribute('data-disabled', 'false');
    // Department selector should be enabled (has task:update)
    expect(selectors[3]).toHaveAttribute('data-disabled', 'false');
  });

  it('enables assignee but disables others when user has task:assign but not task:update', () => {
    setMockPermissions({ task: ['read', 'assign'] });

    render(<TaskPropertiesSidebar {...defaultProps} />);

    const selectors = screen.getAllByTestId('property-selector');

    // Status selector disabled (no task:update)
    expect(selectors[0]).toHaveAttribute('data-disabled', 'true');
    // Assignee selector enabled (has task:assign)
    expect(selectors[1]).toHaveAttribute('data-disabled', 'false');
    // Frequency selector disabled (no task:update)
    expect(selectors[2]).toHaveAttribute('data-disabled', 'true');
    // Department selector disabled (no task:update)
    expect(selectors[3]).toHaveAttribute('data-disabled', 'true');
  });

  it('renders Properties heading regardless of permissions', () => {
    setMockPermissions({});

    render(<TaskPropertiesSidebar {...defaultProps} />);

    expect(screen.getByText('Properties')).toBeInTheDocument();
  });
});
