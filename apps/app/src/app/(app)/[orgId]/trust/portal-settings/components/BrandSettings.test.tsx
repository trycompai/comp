import {
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
  setMockPermissions,
} from '@/test-utils/mocks/permissions';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationMock = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const trustPortalSettingsMock = vi.hoisted(() => ({
  updateToggleSettings: vi.fn(),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('@/hooks/use-trust-portal-settings', () => ({
  useTrustPortalSettings: () => ({
    updateToggleSettings: trustPortalSettingsMock.updateToggleSettings,
  }),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: navigationMock.refresh }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { BrandSettings } from './BrandSettings';

describe('BrandSettings permission gating', () => {
  const defaultProps = {
    primaryColor: '#FF0000',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    trustPortalSettingsMock.updateToggleSettings.mockResolvedValue({
      success: true,
    });
  });

  it('renders title and description regardless of permissions', () => {
    setMockPermissions({});
    render(<BrandSettings {...defaultProps} />);
    expect(screen.getByText('Brand Settings')).toBeInTheDocument();
    expect(screen.getByText('Customize the appearance of your trust portal')).toBeInTheDocument();
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

  it('persists a valid brand color and refreshes settings', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const handlePrimaryColorChange = vi.fn();

    render(<BrandSettings {...defaultProps} onPrimaryColorChange={handlePrimaryColorChange} />);

    const textInput = screen.getByRole('textbox');
    fireEvent.change(textInput, { target: { value: '#00ff00' } });

    await waitFor(() => {
      expect(trustPortalSettingsMock.updateToggleSettings).toHaveBeenCalledWith({
        enabled: true,
        primaryColor: '#00FF00',
      });
    });
    expect(handlePrimaryColorChange).toHaveBeenCalledWith('#00FF00');
    expect(navigationMock.refresh).toHaveBeenCalled();
  });

  it('persists an empty brand color as a reset to default branding', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const handlePrimaryColorChange = vi.fn();

    render(<BrandSettings {...defaultProps} onPrimaryColorChange={handlePrimaryColorChange} />);

    const textInput = screen.getByRole('textbox');
    fireEvent.change(textInput, { target: { value: '' } });

    await waitFor(() => {
      expect(trustPortalSettingsMock.updateToggleSettings).toHaveBeenCalledWith({
        enabled: true,
        primaryColor: '',
      });
    });
    expect(handlePrimaryColorChange).toHaveBeenCalledWith(null);
    expect(navigationMock.refresh).toHaveBeenCalled();
  });
});
