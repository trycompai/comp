import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

const revokeMock = vi.fn();
vi.mock('../hooks/useRevokeAgentAccess', () => ({
  useRevokeAgentAccess: () => ({ revokeAgentAccess: revokeMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock design-system AlertDialog components
vi.mock('@trycompai/design-system', () => ({
  AlertDialog: ({ children, open }: any) =>
    open ? <div data-testid="alert-dialog">{children}</div> : <div>{children}</div>,
  AlertDialogTrigger: ({ children }: any) => (
    <div data-testid="alert-dialog-trigger">{children}</div>
  ),
  AlertDialogContent: ({ children }: any) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogAction: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

import { toast } from 'sonner';
import { RevokeAgentAccessDialog } from './RevokeAgentAccessDialog';

describe('RevokeAgentAccessDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render the button for users without member:update', () => {
    setMockPermissions({});
    render(<RevokeAgentAccessDialog deviceId="dev_1" deviceName="Jane's laptop" />);
    expect(screen.queryByRole('button', { name: /revoke agent access/i })).toBeNull();
  });

  it('renders the button for admins and calls revoke on confirm', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    revokeMock.mockResolvedValue(undefined);

    render(<RevokeAgentAccessDialog deviceId="dev_1" deviceName="Jane's laptop" />);

    fireEvent.click(screen.getByRole('button', { name: /revoke agent access/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^revoke$/i }));

    await waitFor(() => {
      expect(revokeMock).toHaveBeenCalledWith('dev_1');
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it('surfaces a destructive toast on error', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    revokeMock.mockRejectedValue(new Error('forbidden'));

    render(<RevokeAgentAccessDialog deviceId="dev_1" deviceName="Jane's laptop" />);

    fireEvent.click(screen.getByRole('button', { name: /revoke agent access/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^revoke$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/could not revoke/i),
      );
    });
  });
});
