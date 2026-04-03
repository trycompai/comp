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
    updatePolicyOverviewSchema: z.object({
      id: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      entityId: z.string().optional(),
    }),
  };
});

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock design-system
vi.mock('@trycompai/design-system', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AccordionItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Input: (props: any) => <input {...props} />,
  Stack: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Textarea: (props: any) => <textarea {...props} />,
}));

import { UpdatePolicyForm } from './update-policy-form';

const mockPolicy: any = {
  id: 'policy_1',
  name: 'Test Policy',
  description: 'A test policy description',
};

describe('UpdatePolicyForm permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the Save button when user lacks policy:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<UpdatePolicyForm policy={mockPolicy} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('disables the Save button when user has no permissions', () => {
    setMockPermissions({});

    render(<UpdatePolicyForm policy={mockPolicy} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('enables the Save button when user has policy:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<UpdatePolicyForm policy={mockPolicy} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('renders the policy title in the form regardless of permissions', () => {
    setMockPermissions({});

    render(<UpdatePolicyForm policy={mockPolicy} />);

    expect(screen.getByDisplayValue('Test Policy')).toBeInTheDocument();
  });

  it('renders Policy Title and Description labels regardless of permissions', () => {
    setMockPermissions({});

    render(<UpdatePolicyForm policy={mockPolicy} />);

    expect(screen.getByText('Policy Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});
