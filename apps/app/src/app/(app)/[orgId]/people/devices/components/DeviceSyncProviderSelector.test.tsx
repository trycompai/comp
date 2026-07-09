import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  connectionStatus: 'active',
  connectionId: 'icn_1',
  lastSyncAt: null,
  nextSyncAt: null,
};

function mockHook(
  overrides: Partial<ReturnType<typeof buildHookReturn>> = {},
) {
  mockUseDeviceSync.mockReturnValue({ ...buildHookReturn(), ...overrides });
}

function buildHookReturn() {
  return {
    selectedProvider: 'jamf' as string | null,
    isSyncing: false,
    isLoading: false,
    availableProviders: [provider],
    syncDevices: vi.fn(),
    setSyncProvider: vi.fn(),
    getProviderName: (slug: string) => (slug === 'jamf' ? 'Jamf' : slug),
    getProviderLogo: () => provider.logoUrl,
    hasAnyConnection: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHook();
});

describe('DeviceSyncProviderSelector — RBAC gating', () => {
  it('renders the sync controls for a user with integration:update', () => {
    mockHasPermission.mockImplementation(
      (resource: string, action: string) =>
        resource === 'integration' && action === 'update',
    );

    render(<DeviceSyncProviderSelector />);

    expect(
      screen.getByRole('combobox', { name: /Sync devices from/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sync now/i }),
    ).toBeInTheDocument();
    // Trigger (and the inline option list) show the selected provider name.
    expect(screen.getAllByText('Jamf').length).toBeGreaterThan(0);
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

  it('shows the provider picker when the saved provider is no longer connected', async () => {
    const user = userEvent.setup();
    mockHasPermission.mockImplementation(
      (resource: string, action: string) =>
        resource === 'integration' && action === 'update',
    );
    mockHook({
      selectedProvider: 'jamf', // saved, but no longer in the connected list
      availableProviders: [{ ...provider, slug: 'kandji', name: 'Kandji' }],
    });

    render(<DeviceSyncProviderSelector />);

    // The picker must be available so the user can switch to a connected provider.
    const trigger = screen.getByRole('combobox', { name: /Sync devices from/i });
    expect(screen.getByText('Not syncing')).toBeInTheDocument();
    await user.click(trigger);
    expect(
      screen.getByRole('option', { name: /Kandji/i }),
    ).toBeInTheDocument();
    // No Sync now button without a connected selected provider.
    expect(
      screen.queryByRole('button', { name: /Sync now/i }),
    ).not.toBeInTheDocument();
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

describe('DeviceSyncProviderSelector — connection states', () => {
  beforeEach(() => {
    mockHasPermission.mockImplementation(
      (resource: string, action: string) =>
        resource === 'integration' && action === 'update',
    );
  });

  it('shows a labeled connect slot when no device-sync integration has a connection', () => {
    mockHook({
      selectedProvider: null,
      availableProviders: [
        { ...provider, connected: false, connectionStatus: null, connectionId: null },
      ],
      hasAnyConnection: false,
    });

    render(<DeviceSyncProviderSelector />);

    expect(screen.getByText('Device sync')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Connect an integration/i }),
    ).toHaveAttribute('href', '/org_1/integrations');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('lists a broken connection as a disabled option marked Reconnect', async () => {
    const user = userEvent.setup();
    mockHook({
      selectedProvider: null,
      availableProviders: [
        {
          ...provider,
          slug: 'intune',
          name: 'Intune',
          connected: false,
          connectionStatus: 'error',
          connectionId: null,
        },
      ],
      hasAnyConnection: false,
    });

    render(<DeviceSyncProviderSelector />);

    // The select renders (not the connect slot): the org HAS a connection,
    // it just needs a reconnect.
    const trigger = screen.getByRole('combobox', { name: /Sync devices from/i });
    await user.click(trigger);
    const intuneOption = await screen.findByRole('option', { name: /Intune/i });
    expect(intuneOption).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Reconnect')).toBeInTheDocument();
    // Not selectable as a sync source, so no Sync now button either.
    expect(
      screen.queryByRole('button', { name: /Sync now/i }),
    ).not.toBeInTheDocument();
  });

  it('falls back to the connect slot when the API omits connectionStatus (older API response)', () => {
    mockHook({
      selectedProvider: null,
      availableProviders: [
        { ...provider, connected: false, connectionId: null },
      ],
      hasAnyConnection: false,
    });

    render(<DeviceSyncProviderSelector />);

    expect(
      screen.getByRole('link', { name: /Connect an integration/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
