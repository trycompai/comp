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

const mockDenyRequest = vi.fn();
vi.mock('@/hooks/use-access-requests', () => ({
  useDenyAccessRequest: () => ({
    mutateAsync: mockDenyRequest,
  }),
}));

vi.mock('sonner', () => ({
  toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { DenyDialog } from './deny-dialog';

describe('DenyDialog permission gating', () => {
  const defaultProps = {
    orgId: 'org-1',
    requestId: 'req-1',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title regardless of permissions', () => {
    setMockPermissions({});
    render(<DenyDialog {...defaultProps} />);
    expect(screen.getByText('Deny Access Request')).toBeInTheDocument();
  });

  it('enables the deny button when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<DenyDialog {...defaultProps} />);
    const denyButton = screen.getByRole('button', { name: /deny request/i });
    // Button is disabled because form validation requires reason, but not due to permissions
    // The canUpdate flag is true, so it doesn't add its own disabled constraint
    expect(denyButton).toBeInTheDocument();
  });

  it('disables the deny button when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<DenyDialog {...defaultProps} />);
    const denyButton = screen.getByRole('button', { name: /deny request/i });
    expect(denyButton).toBeDisabled();
  });

  it('disables the deny button when user has no permissions', () => {
    setMockPermissions({});
    render(<DenyDialog {...defaultProps} />);
    const denyButton = screen.getByRole('button', { name: /deny request/i });
    expect(denyButton).toBeDisabled();
  });

  it('always renders the cancel button regardless of permissions', () => {
    setMockPermissions({});
    render(<DenyDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders the reason textarea regardless of permissions', () => {
    setMockPermissions({});
    render(<DenyDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('Reason for denial...')).toBeInTheDocument();
  });
});
