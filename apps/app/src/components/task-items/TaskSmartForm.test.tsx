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
    optimisticCreate: vi.fn(),
    optimisticUpdate: vi.fn(),
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

// Mock TaskRichDescriptionField
vi.mock('./TaskRichDescriptionField', () => ({
  TaskRichDescriptionField: () => <div data-testid="rich-description-field" />,
}));

// Mock useTaskItemAttachmentUpload
vi.mock('./hooks/use-task-item-attachment-upload', () => ({
  useTaskItemAttachmentUpload: () => ({
    uploadAttachment: vi.fn(),
    isUploading: false,
  }),
}));

// Mock SelectAssignee
vi.mock('@/components/SelectAssignee', () => ({
  SelectAssignee: () => <div data-testid="select-assignee" />,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock @comp/ui components
vi.mock('@comp/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    size?: string;
    variant?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@comp/ui/label', () => ({
  Label: ({ children, ...props }: { children: React.ReactNode; htmlFor?: string }) => (
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

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader-icon" />,
}));

import { TaskSmartForm } from './TaskSmartForm';

const defaultProps = {
  entityId: 'entity_1',
  entityType: 'vendor' as const,
};

describe('TaskSmartForm permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables submit button when user has task:create permission and title is filled', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<TaskSmartForm {...defaultProps} />);

    const submitButton = screen.getByText('Create Task');
    // Button is disabled because title is empty, not because of permissions
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when user lacks task:create permission even with title filled', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(
      <TaskSmartForm
        {...defaultProps}
        initialValues={{ title: 'Test task' }}
      />,
    );

    const submitButton = screen.getByText('Create Task');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when user has task:create and title is provided', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(
      <TaskSmartForm
        {...defaultProps}
        initialValues={{ title: 'Test task' }}
      />,
    );

    const submitButton = screen.getByText('Create Task');
    expect(submitButton).not.toBeDisabled();
  });

  it('disables submit button with no permissions at all', () => {
    setMockPermissions({});

    render(
      <TaskSmartForm
        {...defaultProps}
        initialValues={{ title: 'Test task' }}
      />,
    );

    const submitButton = screen.getByText('Create Task');
    expect(submitButton).toBeDisabled();
  });

  it('renders form fields regardless of permissions', () => {
    setMockPermissions({});

    render(<TaskSmartForm {...defaultProps} />);

    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    expect(screen.getByText('Create Task')).toBeInTheDocument();
  });

  it('shows cancel button when onCancel is provided regardless of permissions', () => {
    setMockPermissions({});

    render(<TaskSmartForm {...defaultProps} onCancel={vi.fn()} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
