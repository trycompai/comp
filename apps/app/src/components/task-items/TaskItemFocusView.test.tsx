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

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/risks/risk_1',
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock @db
vi.mock('@db', () => ({
  CommentEntityType: { task: 'task' },
}));

// Capture props passed to child components
let sidebarProps: any = null;
let mainContentProps: any = null;

// Mock child components
vi.mock('./TaskItemActivityTimeline', () => ({
  TaskItemActivityTimeline: () => <div data-testid="activity-timeline" />,
}));

vi.mock('./TaskItemFocusSidebar', () => ({
  TaskItemFocusSidebar: (props: any) => {
    sidebarProps = props;
    return <div data-testid="focus-sidebar" />;
  },
}));

vi.mock('./task-item-utils', () => ({
  getTaskIdShort: (id: string) => id.slice(0, 8),
}));

vi.mock('../comments/Comments', () => ({
  Comments: () => <div data-testid="comments" />,
}));

vi.mock('./custom-task/CustomTaskItemMainContent', () => ({
  CustomTaskItemMainContent: (props: any) => {
    mainContentProps = props;
    return <div data-testid="main-content" />;
  },
}));

import { TaskItemFocusView } from './TaskItemFocusView';

const mockTaskItem: any = {
  id: 'tski_abc123def456',
  title: 'Test Task',
  description: 'Test description',
  status: 'todo',
  priority: 'medium',
  assignee: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const defaultProps = {
  taskItem: mockTaskItem,
  entityId: 'entity_1',
  entityType: 'vendor' as const,
  onBack: vi.fn(),
};

describe('TaskItemFocusView permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sidebarProps = null;
    mainContentProps = null;
  });

  it('passes readOnly=false to children when user has task:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TaskItemFocusView {...defaultProps} />);

    expect(mainContentProps).not.toBeNull();
    expect(mainContentProps.readOnly).toBe(false);

    expect(sidebarProps).not.toBeNull();
    expect(sidebarProps.readOnly).toBe(false);
  });

  it('passes readOnly=true to children when user lacks task:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<TaskItemFocusView {...defaultProps} />);

    expect(mainContentProps).not.toBeNull();
    expect(mainContentProps.readOnly).toBe(true);

    expect(sidebarProps).not.toBeNull();
    expect(sidebarProps.readOnly).toBe(true);
  });

  it('passes canDelete=true to sidebar when user has task:delete permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TaskItemFocusView {...defaultProps} />);

    expect(sidebarProps).not.toBeNull();
    expect(sidebarProps.canDelete).toBe(true);
  });

  it('passes canDelete=false to sidebar when user lacks task:delete permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<TaskItemFocusView {...defaultProps} />);

    expect(sidebarProps).not.toBeNull();
    expect(sidebarProps.canDelete).toBe(false);
  });

  it('passes canDelete=false when user has no permissions', () => {
    setMockPermissions({});

    render(<TaskItemFocusView {...defaultProps} />);

    expect(sidebarProps).not.toBeNull();
    expect(sidebarProps.canDelete).toBe(false);
    expect(sidebarProps.readOnly).toBe(true);
  });

  it('always renders activity timeline and comments regardless of permissions', () => {
    setMockPermissions({});

    render(<TaskItemFocusView {...defaultProps} />);

    expect(screen.getByTestId('activity-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('comments')).toBeInTheDocument();
  });
});
