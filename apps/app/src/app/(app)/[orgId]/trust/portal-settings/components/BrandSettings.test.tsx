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
    updateToggleSettings: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { BrandSettings } from './BrandSettings';

describe('BrandSettings permission gating', () => {
  const defaultProps = {
    orgId: 'org-1',
    primaryColor: '#FF0000',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and description regardless of permissions', () => {
    setMockPermissions({});
    render(<BrandSettings {...defaultProps} />);
    expect(screen.getByText('Brand Settings')).toBeInTheDocument();
    expect(
      screen.getByText('Customize the appearance of your trust portal'),
    ).toBeInTheDocument();
  });

  it('enables the color picker input when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<BrandSettings {...defaultProps} />);
    const colorInput = screen.getByDisplayValue('#FF0000');
    expect(colorInput).not.toBeDisabled();
  });

  it('disables the color picker input when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<BrandSettings {...defaultProps} />);
    const colorInput = screen.getByDisplayValue('#FF0000');
    expect(colorInput).toBeDisabled();
  });

  it('disables the color picker when user has no permissions', () => {
    setMockPermissions({});
    render(<BrandSettings {...defaultProps} />);
    const colorInput = screen.getByDisplayValue('#FF0000');
    expect(colorInput).toBeDisabled();
  });

  it('renders brand color label regardless of permissions', () => {
    setMockPermissions({});
    render(<BrandSettings {...defaultProps} />);
    expect(screen.getByText('Brand Color')).toBeInTheDocument();
  });
});
