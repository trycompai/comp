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

// Mock useRiskActions
vi.mock('@/hooks/use-risks', () => ({
  useRiskActions: () => ({
    updateRisk: vi.fn(),
  }),
}));

// Mock useSWRConfig
vi.mock('swr', () => ({
  useSWRConfig: () => ({
    mutate: vi.fn(),
  }),
}));

// Mock actions/schema
vi.mock('@/actions/schema', async () => {
  const { z } = await import('zod');
  return {
    updateRiskSchema: z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      assigneeId: z.string().nullable().optional(),
      category: z.string().optional(),
      department: z.string().optional(),
      status: z.string().optional(),
    }),
  };
});

// Mock StatusIndicator
vi.mock('@/components/status-indicator', () => ({
  StatusIndicator: ({ status }: { status: string }) => (
    <span data-testid="status-indicator">{status}</span>
  ),
}));

// Mock SelectAssignee
vi.mock('@/components/SelectAssignee', () => ({
  SelectAssignee: ({
    disabled,
  }: {
    disabled?: boolean;
    assigneeId: string | null;
    assignees: unknown[];
    onAssigneeChange: (id: string) => void;
    withTitle?: boolean;
  }) => <div data-testid="select-assignee" data-disabled={disabled} />,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock @db enums
vi.mock('@db', () => ({
  Departments: { admin: 'admin', hr: 'hr' },
  Member: {},
  RiskCategory: { operations: 'operations', financial: 'financial' },
  RiskStatus: { open: 'open', closed: 'closed', pending: 'pending' },
  User: {},
}));

import { UpdateRiskOverview } from './risk-overview';

const mockRisk: any = {
  id: 'risk_1',
  title: 'Test Risk',
  description: 'A test risk',
  assigneeId: null,
  category: 'operations',
  department: 'admin',
  status: 'open',
};

const mockAssignees: any[] = [];

describe('UpdateRiskOverview permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides the Save button when user lacks risk:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<UpdateRiskOverview risk={mockRisk} assignees={mockAssignees} />);

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('hides the Save button when user has no permissions', () => {
    setMockPermissions({});

    render(<UpdateRiskOverview risk={mockRisk} assignees={mockAssignees} />);

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('shows the Save button when user has risk:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<UpdateRiskOverview risk={mockRisk} assignees={mockAssignees} />);

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('passes disabled=true to SelectAssignee when user lacks risk:update', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<UpdateRiskOverview risk={mockRisk} assignees={mockAssignees} />);

    const selectAssignee = screen.getByTestId('select-assignee');
    expect(selectAssignee).toHaveAttribute('data-disabled', 'true');
  });

  it('passes disabled=false to SelectAssignee when user has risk:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<UpdateRiskOverview risk={mockRisk} assignees={mockAssignees} />);

    const selectAssignee = screen.getByTestId('select-assignee');
    expect(selectAssignee).toHaveAttribute('data-disabled', 'false');
  });

  it('renders form labels regardless of permissions', () => {
    setMockPermissions({});

    render(<UpdateRiskOverview risk={mockRisk} assignees={mockAssignees} />);

    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Department')).toBeInTheDocument();
  });
});
