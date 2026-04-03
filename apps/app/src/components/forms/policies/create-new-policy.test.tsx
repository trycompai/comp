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
    createPolicy: vi.fn(),
  }),
}));

// Mock actions/schema
vi.mock('@/actions/schema', async () => {
  const { z } = await import('zod');
  return {
    createPolicySchema: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
    }),
  };
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/policies',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock design-system components
vi.mock('@trycompai/design-system', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    loading,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    loading?: boolean;
    iconRight?: React.ReactNode;
  }) => (
    <button disabled={disabled || loading} onClick={onClick}>
      {children}
    </button>
  ),
  Input: (props: any) => <input {...props} />,
  Label: ({
    children,
    ...props
  }: { children: React.ReactNode; htmlFor?: string }) => (
    <label {...props}>{children}</label>
  ),
  Stack: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Text: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  Textarea: (props: any) => <textarea {...props} />,
}));

// Mock design-system icons
vi.mock('@trycompai/design-system/icons', () => ({
  ArrowRight: () => <span data-testid="arrow-right-icon" />,
}));

import { CreateNewPolicyForm } from './create-new-policy';

describe('CreateNewPolicyForm permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the Create button when user lacks policy:create permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<CreateNewPolicyForm />);

    const createButton = screen.getByRole('button', { name: /create/i });
    expect(createButton).toBeDisabled();
  });

  it('disables the Create button when user has no permissions', () => {
    setMockPermissions({});

    render(<CreateNewPolicyForm />);

    const createButton = screen.getByRole('button', { name: /create/i });
    expect(createButton).toBeDisabled();
  });

  it('enables the Create button when user has policy:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<CreateNewPolicyForm />);

    const createButton = screen.getByRole('button', { name: /create/i });
    expect(createButton).not.toBeDisabled();
  });

  it('renders form fields regardless of permissions', () => {
    setMockPermissions({});

    render(<CreateNewPolicyForm />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });
});
