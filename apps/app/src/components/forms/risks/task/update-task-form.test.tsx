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

// Mock useTaskMutations
vi.mock('@/hooks/use-task-mutations', () => ({
  useTaskMutations: () => ({
    updateTask: vi.fn(),
  }),
}));

// Mock actions/schema
vi.mock('@/actions/schema', async () => {
  const { z } = await import('zod');
  return {
    updateTaskSchema: z.object({
      id: z.string(),
      assigneeId: z.string().nullable().optional(),
      status: z.string().optional(),
      dueDate: z.date().optional(),
    }),
  };
});

// Mock StatusIndicator
vi.mock('@/components/status-indicator', () => ({
  StatusIndicator: ({ status }: { status: string }) => (
    <span data-testid="status-indicator">{status}</span>
  ),
}));

// Mock select-user
vi.mock('@/components/select-user', () => ({
  SelectUser: () => <div data-testid="select-user" />,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock @db enums
vi.mock('@db', () => ({
  TaskStatus: { todo: 'todo', in_progress: 'in_progress', done: 'done' },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: () => 'Jan 1, 2026',
}));

import { UpdateTaskForm } from './update-task-form';

const mockTask: any = {
  id: 'task_1',
  assigneeId: null,
  status: 'todo',
};

const mockUsers: any[] = [];

describe('UpdateTaskForm permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the Save button when user lacks task:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<UpdateTaskForm task={mockTask} users={mockUsers} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('disables the Save button when user has no permissions', () => {
    setMockPermissions({});

    render(<UpdateTaskForm task={mockTask} users={mockUsers} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('enables the Save button when user has task:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<UpdateTaskForm task={mockTask} users={mockUsers} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('renders form labels regardless of permissions', () => {
    setMockPermissions({});

    render(<UpdateTaskForm task={mockTask} users={mockUsers} />);

    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
  });
});
