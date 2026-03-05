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

// Mock next/navigation (override global to add useParams)
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ orgId: 'org_123', taskId: 'task_123' })),
  };
});

// Mock useTask hook
const mockTask = {
  id: 'task_123',
  title: 'Test Task',
  description: 'A test task description',
  status: 'open',
  assigneeId: null,
  approverId: null,
  frequency: null,
  department: null,
  reviewDate: null,
  automationStatus: 'MANUAL',
  controls: [],
  fileUrls: [],
};

const mockMutateTask = vi.fn();
vi.mock('../hooks/use-task', () => ({
  useTask: () => ({
    task: mockTask,
    isLoading: false,
    mutate: mockMutateTask,
    updateTask: vi.fn(),
    regenerateTask: vi.fn(),
    submitForReview: vi.fn(),
    approveTask: vi.fn(),
    rejectTask: vi.fn(),
  }),
}));

// Mock useTaskAutomations
vi.mock('../hooks/use-task-automations', () => ({
  useTaskAutomations: () => ({
    automations: [],
  }),
}));

// Mock useTaskActivity
vi.mock('../hooks/use-task-activity', () => ({
  useTaskActivity: () => ({
    mutate: vi.fn(),
  }),
}));

// Mock useActiveMember
vi.mock('@/utils/auth-client', () => ({
  useActiveMember: () => ({
    data: { id: 'member_1', role: 'admin' },
  }),
}));

// Mock useOrganizationMembers
vi.mock('@/hooks/use-organization-members', () => ({
  useOrganizationMembers: () => ({
    members: [
      {
        id: 'member_1',
        user: { id: 'user_1', name: 'Test User', email: 'test@example.com' },
      },
    ],
  }),
}));

// Mock evidence download
vi.mock('@/lib/evidence-download', () => ({
  downloadTaskEvidenceZip: vi.fn(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock @comp/ui components
vi.mock('@comp/ui/breadcrumb', () => ({
  Breadcrumb: ({ children }: any) => <nav>{children}</nav>,
  BreadcrumbItem: ({ children }: any) => <span>{children}</span>,
  BreadcrumbLink: ({ children }: any) => <span>{children}</span>,
  BreadcrumbList: ({ children }: any) => <ol>{children}</ol>,
  BreadcrumbSeparator: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@comp/ui/button', () => ({
  Button: ({ children, title, ...props }: any) => (
    <button title={title} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

// Mock design system
vi.mock('@trycompai/design-system', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock child components
vi.mock('../../../../../../components/comments/Comments', () => ({
  Comments: () => <div data-testid="comments" />,
}));

vi.mock('./BrowserAutomations', () => ({
  BrowserAutomations: () => <div data-testid="browser-automations" />,
}));

vi.mock('./findings/FindingHistoryPanel', () => ({
  FindingHistoryPanel: () => <div data-testid="finding-history-panel" />,
}));

vi.mock('./findings/FindingsList', () => ({
  FindingsList: () => <div data-testid="findings-list" />,
}));

vi.mock('./TaskAutomations', () => ({
  TaskAutomations: () => <div data-testid="task-automations" />,
}));

vi.mock('./TaskAutomationStatusBadge', () => ({
  TaskAutomationStatusBadge: () => <span data-testid="automation-status-badge" />,
}));

vi.mock('./TaskDeleteDialog', () => ({
  TaskDeleteDialog: ({ isOpen }: any) =>
    isOpen ? <div data-testid="delete-dialog" /> : null,
}));

vi.mock('./TaskIntegrationChecks', () => ({
  TaskIntegrationChecks: () => <div data-testid="integration-checks" />,
}));

vi.mock('./TaskMainContent', () => ({
  TaskMainContent: () => <div data-testid="task-main-content" />,
}));

vi.mock('./TaskActivity', () => ({
  TaskActivityFull: () => <div data-testid="task-activity" />,
}));

vi.mock('./TaskPropertiesSidebar', () => ({
  TaskPropertiesSidebar: () => <div data-testid="task-properties-sidebar" />,
}));

vi.mock('@/components/SelectAssignee', () => ({
  SelectAssignee: () => <div data-testid="select-assignee" />,
}));

import { SingleTask } from './SingleTask';

const defaultProps = {
  initialTask: mockTask as any,
  initialMembers: [],
  initialAutomations: [],
  isWebAutomationsEnabled: false,
  isPlatformAdmin: false,
  evidenceApprovalEnabled: false,
};

describe('SingleTask permission gating', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('renders task title regardless of permissions', () => {
    setMockPermissions({});

    render(<SingleTask {...defaultProps} />);

    // Title appears in breadcrumb and heading; just verify at least one exists
    expect(screen.getAllByText('Test Task').length).toBeGreaterThanOrEqual(1);
  });

  it('shows regenerate and delete buttons for admin', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<SingleTask {...defaultProps} />);

    expect(screen.getByTitle('Regenerate task')).toBeInTheDocument();
    expect(screen.getByTitle('Delete task')).toBeInTheDocument();
  });

  it('hides regenerate button when user lacks task:update', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<SingleTask {...defaultProps} />);

    expect(screen.queryByTitle('Regenerate task')).not.toBeInTheDocument();
  });

  it('hides delete button when user lacks task:delete', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<SingleTask {...defaultProps} />);

    expect(screen.queryByTitle('Delete task')).not.toBeInTheDocument();
  });

  it('always shows the download evidence button regardless of permissions', () => {
    setMockPermissions({});

    render(<SingleTask {...defaultProps} />);

    expect(screen.getByTitle('Download task evidence')).toBeInTheDocument();
  });

  it('shows regenerate but not delete with only task:update permission', () => {
    setMockPermissions({ task: ['read', 'update'] });

    render(<SingleTask {...defaultProps} />);

    expect(screen.getByTitle('Regenerate task')).toBeInTheDocument();
    expect(screen.queryByTitle('Delete task')).not.toBeInTheDocument();
  });

  it('shows delete but not regenerate with only task:delete permission', () => {
    setMockPermissions({ task: ['read', 'delete'] });

    render(<SingleTask {...defaultProps} />);

    expect(screen.queryByTitle('Regenerate task')).not.toBeInTheDocument();
    expect(screen.getByTitle('Delete task')).toBeInTheDocument();
  });
});
