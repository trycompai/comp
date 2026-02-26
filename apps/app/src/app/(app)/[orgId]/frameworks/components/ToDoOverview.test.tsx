import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  NO_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock @trigger.dev/react-hooks
vi.mock('@trigger.dev/react-hooks', () => ({
  useRealtimeRun: () => ({ run: null }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock @comp/ui components
vi.mock('@comp/ui/button', () => ({
  Button: ({ children, disabled, asChild, ...props }: any) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@comp/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@comp/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => (
    <div data-testid="tabs" data-default={defaultValue}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

// Mock ConfirmActionDialog
vi.mock('./ConfirmActionDialog', () => ({
  ConfirmActionDialog: ({ isOpen, title }: any) =>
    isOpen ? <div data-testid="confirm-dialog">{title}</div> : null,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ArrowRight: () => <span data-testid="arrow-icon" />,
  CheckCircle2: () => <span data-testid="check-icon" />,
  FileText: () => <span data-testid="file-icon" />,
  ListCheck: () => <span data-testid="list-icon" />,
  NotebookText: () => <span data-testid="notebook-icon" />,
  Play: () => <span data-testid="play-icon" />,
  Upload: () => <span data-testid="upload-icon" />,
}));

import { ToDoOverview } from './ToDoOverview';

const mockUnpublishedPolicies = [
  {
    id: 'pol-1',
    name: 'Security Policy',
    status: 'draft',
    organizationId: 'org-1',
  },
  {
    id: 'pol-2',
    name: 'Privacy Policy',
    status: 'draft',
    organizationId: 'org-1',
  },
] as any[];

const mockIncompleteTasks = [
  {
    id: 'task-1',
    title: 'Complete SOC 2 audit',
    status: 'open',
    organizationId: 'org-1',
  },
] as any[];

const defaultProps = {
  totalPolicies: 10,
  totalTasks: 5,
  remainingPolicies: 2,
  remainingTasks: 1,
  unpublishedPolicies: mockUnpublishedPolicies,
  incompleteTasks: mockIncompleteTasks,
  policiesInReview: [] as any[],
  organizationId: 'org-1',
  currentMember: { id: 'member-1', role: 'admin' },
  onboardingTriggerJobId: null,
};

describe('ToDoOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission gating', () => {
    it('shows "Publish All Policies" button when user has policy:update permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ToDoOverview {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /publish all policies/i }),
      ).toBeInTheDocument();
    });

    it('hides "Publish All Policies" button when user lacks policy:update permission (auditor)', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<ToDoOverview {...defaultProps} />);

      expect(
        screen.queryByRole('button', { name: /publish all policies/i }),
      ).not.toBeInTheDocument();
    });

    it('hides "Publish All Policies" button when user has no permissions', () => {
      setMockPermissions(NO_PERMISSIONS);

      render(<ToDoOverview {...defaultProps} />);

      expect(
        screen.queryByRole('button', { name: /publish all policies/i }),
      ).not.toBeInTheDocument();
    });

    it('checks the correct resource and action for permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ToDoOverview {...defaultProps} />);

      expect(mockHasPermission).toHaveBeenCalledWith('policy', 'update');
    });
  });

  describe('Rendering', () => {
    it('renders "Quick Actions" title', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ToDoOverview {...defaultProps} />);

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('renders policy list when there are unpublished policies', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ToDoOverview {...defaultProps} />);

      expect(screen.getByText('Security Policy')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('renders task list when there are incomplete tasks', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ToDoOverview {...defaultProps} />);

      expect(
        screen.getByText('Complete SOC 2 audit'),
      ).toBeInTheDocument();
    });

    it('shows "All policies are published!" when no unpublished policies exist', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(
        <ToDoOverview
          {...defaultProps}
          unpublishedPolicies={[]}
          remainingPolicies={0}
        />,
      );

      expect(
        screen.getByText('All policies are published!'),
      ).toBeInTheDocument();
    });

    it('does not show publish button even with permissions when no unpublished policies', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(
        <ToDoOverview
          {...defaultProps}
          unpublishedPolicies={[]}
          remainingPolicies={0}
        />,
      );

      expect(
        screen.queryByRole('button', { name: /publish all policies/i }),
      ).not.toBeInTheDocument();
    });

    it('renders tab triggers for policies and tasks', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ToDoOverview {...defaultProps} />);

      expect(screen.getByTestId('tab-trigger-policies')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-tasks')).toBeInTheDocument();
    });
  });
});
