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

vi.mock('@/hooks/use-trust-portal-settings', () => ({
  useTrustPortalSettings: () => ({
    updateAllowedDomains: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { AllowedDomainsManager } from './AllowedDomainsManager';

describe('AllowedDomainsManager permission gating', () => {
  const defaultProps = {
    initialDomains: ['example.com', 'test.org'],
    orgId: 'org-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and description regardless of permissions', () => {
    setMockPermissions({});
    render(<AllowedDomainsManager {...defaultProps} />);
    expect(screen.getByText('NDA Bypass - Allowed Domains')).toBeInTheDocument();
    expect(
      screen.getByText('Email domains that bypass NDA signing for trust portal access'),
    ).toBeInTheDocument();
  });

  it('renders existing domains regardless of permissions', () => {
    setMockPermissions({});
    render(<AllowedDomainsManager {...defaultProps} />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('test.org')).toBeInTheDocument();
  });

  it('enables the domain input when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<AllowedDomainsManager {...defaultProps} />);
    const input = screen.getByPlaceholderText('example.com');
    expect(input).not.toBeDisabled();
  });

  it('disables the domain input when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<AllowedDomainsManager {...defaultProps} />);
    const input = screen.getByPlaceholderText('example.com');
    expect(input).toBeDisabled();
  });

  it('disables the domain input when user has no permissions', () => {
    setMockPermissions({});
    render(<AllowedDomainsManager {...defaultProps} />);
    const input = screen.getByPlaceholderText('example.com');
    expect(input).toBeDisabled();
  });

  it('disables domain remove buttons when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<AllowedDomainsManager {...defaultProps} />);
    const removeButtons = screen.getAllByRole('button');
    // The remove buttons inside badges should be disabled
    const badgeRemoveButtons = removeButtons.filter(
      (btn) => btn.closest('.flex.items-center.gap-1'),
    );
    for (const btn of badgeRemoveButtons) {
      expect(btn).toBeDisabled();
    }
  });
});
