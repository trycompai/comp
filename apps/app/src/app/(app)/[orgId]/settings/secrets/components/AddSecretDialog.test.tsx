import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

const mockCreateSecret = vi.fn();

vi.mock('../hooks/useSecrets', () => ({
  useSecrets: () => ({
    secrets: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    createSecret: mockCreateSecret,
    updateSecret: vi.fn(),
    deleteSecret: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@comp/ui/button', () => ({
  Button: ({ children, disabled, onClick, type, ...props }: any) => (
    <button disabled={disabled} onClick={onClick} type={type} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : <div>{children}</div>),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children, asChild }: any) => <div data-testid="dialog-trigger">{children}</div>,
}));

vi.mock('@comp/ui/input', () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}));

vi.mock('@comp/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('@comp/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@comp/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
}));

import { AddSecretDialog } from './AddSecretDialog';

describe('AddSecretDialog permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Add Secret trigger button regardless of permissions', () => {
    setMockPermissions({});
    render(<AddSecretDialog />);

    expect(screen.getByText('Add Secret')).toBeInTheDocument();
  });

  it('disables Create Secret submit button when user lacks organization:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<AddSecretDialog />);

    const submitButton = screen.getByRole('button', { name: /create secret/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables Create Secret submit button when user has no permissions', () => {
    setMockPermissions({});
    render(<AddSecretDialog />);

    const submitButton = screen.getByRole('button', { name: /create secret/i });
    expect(submitButton).toBeDisabled();
  });

  it('does not disable Create Secret submit button due to permissions when user has organization:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<AddSecretDialog />);

    // The button may still be disabled due to form validation (empty fields),
    // but canManageSecrets is true so permission is not the blocker
    const submitButton = screen.getByRole('button', { name: /create secret/i });
    // With admin permissions, isSubmitting is false and canManageSecrets is true
    // disabled={isSubmitting || !canManageSecrets} => disabled={false || false} => false
    expect(submitButton).not.toBeDisabled();
  });
});
