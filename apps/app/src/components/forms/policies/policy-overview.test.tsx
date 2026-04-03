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

// Mock usePolicyMutations
vi.mock('@/hooks/use-policy-mutations', () => ({
  usePolicyMutations: () => ({
    updatePolicy: vi.fn(),
  }),
}));

// Mock actions/schema
vi.mock('@/actions/schema', async () => {
  const { z } = await import('zod');
  return {
    updatePolicyFormSchema: z.object({
      id: z.string(),
      status: z.string().optional(),
      assigneeId: z.string().optional(),
      department: z.string().optional(),
      review_frequency: z.string().optional(),
      review_date: z.date().optional(),
    }),
  };
});

// Mock useSession
vi.mock('@/utils/auth-client', () => ({
  useSession: () => ({
    data: { user: { id: 'user_1' } },
  }),
}));

// Mock StatusIndicator
vi.mock('@/components/status-indicator', () => ({
  StatusIndicator: ({ status }: { status: string }) => (
    <span data-testid="status-indicator">{status}</span>
  ),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock @db enums
vi.mock('@db', () => ({
  Departments: { admin: 'admin', hr: 'hr', it: 'it' },
  Frequency: { monthly: 'monthly', quarterly: 'quarterly', annually: 'annually' },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: () => 'Jan 1, 2026',
}));

import { UpdatePolicyOverview } from './policy-overview';

const mockPolicy: any = {
  id: 'policy_1',
  status: 'draft',
  assigneeId: 'user_1',
  department: 'admin',
  frequency: 'monthly',
  reviewDate: '2026-06-01',
};

describe('UpdatePolicyOverview permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the Save button when user lacks policy:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<UpdatePolicyOverview policy={mockPolicy} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('disables the Save button when user has no permissions', () => {
    setMockPermissions({});

    render(<UpdatePolicyOverview policy={mockPolicy} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('enables the Save button when user has policy:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<UpdatePolicyOverview policy={mockPolicy} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('renders form labels regardless of permissions', () => {
    setMockPermissions({});

    render(<UpdatePolicyOverview policy={mockPolicy} />);

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Review Frequency')).toBeInTheDocument();
    expect(screen.getByText('Department')).toBeInTheDocument();
  });
});
