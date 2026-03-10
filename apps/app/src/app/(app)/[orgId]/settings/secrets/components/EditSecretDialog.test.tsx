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

const mockUpdateSecret = vi.fn();

vi.mock('../hooks/useSecrets', () => ({
  useSecrets: () => ({
    secrets: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    createSecret: vi.fn(),
    updateSecret: mockUpdateSecret,
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
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
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
}));

import { EditSecretDialog } from './EditSecretDialog';

const sampleSecret = {
  id: 'secret-1',
  name: 'GITHUB_TOKEN',
  description: 'GitHub access token',
  category: 'api_keys',
};

describe('EditSecretDialog permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables Update Secret button when user has organization:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(
      <EditSecretDialog secret={sampleSecret} open={true} onOpenChange={vi.fn()} />,
    );

    const updateButton = screen.getByRole('button', { name: /update secret/i });
    expect(updateButton).not.toBeDisabled();
  });

  it('disables Update Secret button when user lacks organization:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(
      <EditSecretDialog secret={sampleSecret} open={true} onOpenChange={vi.fn()} />,
    );

    const updateButton = screen.getByRole('button', { name: /update secret/i });
    expect(updateButton).toBeDisabled();
  });

  it('disables Update Secret button when user has no permissions', () => {
    setMockPermissions({});
    render(
      <EditSecretDialog secret={sampleSecret} open={true} onOpenChange={vi.fn()} />,
    );

    const updateButton = screen.getByRole('button', { name: /update secret/i });
    expect(updateButton).toBeDisabled();
  });

  it('does not render when dialog is closed', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const { container } = render(
      <EditSecretDialog secret={sampleSecret} open={false} onOpenChange={vi.fn()} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('displays Edit Secret title and secret name in form', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(
      <EditSecretDialog secret={sampleSecret} open={true} onOpenChange={vi.fn()} />,
    );

    expect(screen.getByText('Edit Secret')).toBeInTheDocument();
  });
});
