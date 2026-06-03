import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceSyncProviderSelector } from './DeviceSyncProviderSelector';
import type { DeviceSyncProviderInfo } from '../hooks/useDeviceSync';

const { mockHasPermission, mockUseDeviceSync } = vi.hoisted(() => ({
  mockHasPermission: vi.fn(),
  mockUseDeviceSync: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1' }),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ hasPermission: mockHasPermission }),
}));

vi.mock('../hooks/useDeviceSync', () => ({
  useDeviceSync: (opts: { organizationId: string; enabled?: boolean }) =>
    mockUseDeviceSync(opts),
}));

const provider: DeviceSyncProviderInfo = {
  slug: 'jamf',
  name: 'Jamf',
  logoUrl: 'https://example.com/jamf.png',
  connected: true,
  connectionId: 'icn_1',
  lastSyncAt: null,
  nextSyncAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseDeviceSync.mockReturnValue({
    selectedProvider: 'jamf',
    isSyncing: false,
    isLoading: false,
    availableProviders: [provider],
    syncDevices: vi.fn(),
    setSyncProvider: vi.fn(),
    getProviderName: (slug: string) => (slug === 'jamf' ? 'Jamf' : slug),
    getProviderLogo: () => provider.logoUrl,
    hasAnyConnection: true,
  });
});

describe('DeviceSyncProviderSelector — RBAC gating', () => {
  it('renders the sync controls for a user with integration:update', () => {
    mockHasPermission.mockImplementation(
      (resource: string, action: string) =>
        resource === 'integration' && action === 'update',
    );

    render(<DeviceSyncProviderSelector />);

    expect(
      screen.getByRole('button', { name: /Sync now/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Jamf')).toBeInTheDocument();
    // Hook is enabled (and therefore allowed to hit the device-sync APIs).
    expect(mockUseDeviceSync).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('renders nothing for a user without integration:update and disables the hook', () => {
    mockHasPermission.mockReturnValue(false);

    const { container } = render(<DeviceSyncProviderSelector />);

    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByRole('button', { name: /Sync now/i }),
    ).not.toBeInTheDocument();
    // The hook must be disabled so no device-sync API is called without permission.
    expect(mockUseDeviceSync).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('shows the provider picker when the saved provider is no longer connected', () => {
    mockHasPermission.mockImplementation(
      (resource: string, action: string) =>
        resource === 'integration' && action === 'update',
    );
    mockUseDeviceSync.mockReturnValue({
      selectedProvider: 'jamf', // saved, but no longer in the connected list
      isSyncing: false,
      isLoading: false,
      availableProviders: [{ ...provider, slug: 'kandji', name: 'Kandji' }],
      syncDevices: vi.fn(),
      setSyncProvider: vi.fn(),
      getProviderName: (slug: string) => (slug === 'kandji' ? 'Kandji' : slug),
      getProviderLogo: () => provider.logoUrl,
      hasAnyConnection: true,
    });

    render(<DeviceSyncProviderSelector />);

    // The picker must be available so the user can switch to a connected provider.
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kandji' })).toBeInTheDocument();
  });

  it('does not render for read-only integration access (integration:read only)', () => {
    mockHasPermission.mockImplementation(
      (resource: string, action: string) =>
        resource === 'integration' && action === 'read',
    );

    const { container } = render(<DeviceSyncProviderSelector />);

    expect(container).toBeEmptyDOMElement();
  });
});
