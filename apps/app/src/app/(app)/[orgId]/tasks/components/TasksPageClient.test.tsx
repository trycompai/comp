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

// Mock useTasks hook
const mockCreateTask = vi.fn();
const mockMutateTasks = vi.fn();
vi.mock('../hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [],
    createTask: mockCreateTask,
    mutate: mockMutateTasks,
  }),
}));

// Mock child components to isolate TasksPageClient
vi.mock('./CreateTaskSheet', () => ({
  CreateTaskSheet: () => <div data-testid="create-task-sheet" />,
}));

vi.mock('./TaskList', () => ({
  TaskList: () => <div data-testid="task-list" />,
}));

// Mock evidence download
vi.mock('@/lib/evidence-download', () => ({
  downloadAllEvidenceZip: vi.fn(),
}));

// Mock design system components
vi.mock('@trycompai/design-system', () => ({
  Button: ({
    children,
    onClick,
    iconLeft: _iconLeft,
    width: _width,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    iconLeft?: React.ReactNode;
    width?: string;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  PageHeader: ({
    title,
    actions,
  }: {
    title: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
  PageLayout: ({
    children,
    header,
  }: {
    children: React.ReactNode;
    header: React.ReactNode;
  }) => (
    <div>
      {header}
      {children}
    </div>
  ),
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Switch: () => <input type="checkbox" />,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span data-testid="add-icon" />,
  ArrowDown: () => <span data-testid="arrow-down-icon" />,
}));

import { TasksPageClient } from './TasksPageClient';

const defaultProps = {
  tasks: [],
  members: [],
  controls: [],
  frameworkInstances: [],
  activeTab: 'list' as const,
  orgId: 'org_123',
  organizationName: 'Test Org',
  hasEvidenceExportAccess: false,
};

describe('TasksPageClient permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Create Evidence" button when user has task:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TasksPageClient {...defaultProps} />);

    expect(screen.getByText('Create Evidence')).toBeInTheDocument();
  });

  it('hides "Create Evidence" button when user lacks task:create permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<TasksPageClient {...defaultProps} />);

    expect(screen.queryByText('Create Evidence')).not.toBeInTheDocument();
  });

  it('hides "Create Evidence" button when user has no permissions', () => {
    setMockPermissions({});

    render(<TasksPageClient {...defaultProps} />);

    expect(screen.queryByText('Create Evidence')).not.toBeInTheDocument();
  });

  it('shows "Create Evidence" button with only task:create permission', () => {
    setMockPermissions({ task: ['create'] });

    render(<TasksPageClient {...defaultProps} />);

    expect(screen.getByText('Create Evidence')).toBeInTheDocument();
  });

  it('always renders TaskList regardless of permissions', () => {
    setMockPermissions({});

    render(<TasksPageClient {...defaultProps} />);

    expect(screen.getByTestId('task-list')).toBeInTheDocument();
  });
});
