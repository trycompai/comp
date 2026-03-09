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

const mockRevokeGrant = vi.fn();
vi.mock('@/hooks/use-access-requests', () => ({
  useRevokeAccessGrant: () => ({
    mutateAsync: mockRevokeGrant,
  }),
}));

vi.mock('sonner', () => ({
  toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { RevokeDialog } from './revoke-dialog';

describe('RevokeDialog permission gating', () => {
  const defaultProps = {
    orgId: 'org-1',
    grantId: 'grant-1',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title regardless of permissions', () => {
    setMockPermissions({});
    render(<RevokeDialog {...defaultProps} />);
    expect(screen.getByText('Revoke Access Grant')).toBeInTheDocument();
  });

  it('enables the revoke button when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<RevokeDialog {...defaultProps} />);
    const revokeButton = screen.getByRole('button', { name: /revoke grant/i });
    expect(revokeButton).toBeInTheDocument();
  });

  it('disables the revoke button when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<RevokeDialog {...defaultProps} />);
    const revokeButton = screen.getByRole('button', { name: /revoke grant/i });
    expect(revokeButton).toBeDisabled();
  });

  it('disables the revoke button when user has no permissions', () => {
    setMockPermissions({});
    render(<RevokeDialog {...defaultProps} />);
    const revokeButton = screen.getByRole('button', { name: /revoke grant/i });
    expect(revokeButton).toBeDisabled();
  });

  it('always renders the cancel button regardless of permissions', () => {
    setMockPermissions({});
    render(<RevokeDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders the reason textarea regardless of permissions', () => {
    setMockPermissions({});
    render(<RevokeDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('Reason for revocation...')).toBeInTheDocument();
  });
});
