import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DeviceWithChecks } from '../types';

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1' }),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock('../lib/devices-csv', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/devices-csv')>();
  return {
    ...mod,
    downloadDevicesCsv: vi.fn(),
  };
});

import { DeviceAgentDevicesList } from './DeviceAgentDevicesList';
import { downloadDevicesCsv } from '../lib/devices-csv';

const mockDownload = vi.mocked(downloadDevicesCsv);

function makeDevice(overrides: Partial<DeviceWithChecks> = {}): DeviceWithChecks {
  return {
    id: 'dev_1',
    name: 'Mac',
    hostname: 'mac',
    platform: 'macos',
    osVersion: '14.0',
    serialNumber: 'SN1',
    hardwareModel: 'MBP',
    isCompliant: true,
    diskEncryptionEnabled: true,
    antivirusEnabled: true,
    passwordPolicySet: true,
    screenLockEnabled: true,
    checkDetails: null,
    lastCheckIn: new Date().toISOString(),
    agentVersion: '1.0.0',
    installedAt: new Date().toISOString(),
    memberId: 'mem_1',
    user: { name: 'Jane', email: 'jane@example.com' },
    source: 'device_agent',
    complianceStatus: 'compliant',
    daysSinceLastCheckIn: 0,
    hasActiveAgentSession: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeviceAgentDevicesList', () => {
  it('renders "Yes" for a compliant device', () => {
    render(<DeviceAgentDevicesList devices={[makeDevice()]} />);
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('renders "No" for a non-compliant fresh device', () => {
    render(
      <DeviceAgentDevicesList
        devices={[makeDevice({ isCompliant: false, complianceStatus: 'non_compliant' })]}
      />,
    );
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renders "Stale (Nd)" for a stale device and shows em-dash check badges', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeDevice({
            complianceStatus: 'stale',
            daysSinceLastCheckIn: 34,
            diskEncryptionEnabled: true,
            antivirusEnabled: true,
            passwordPolicySet: true,
            screenLockEnabled: true,
          }),
        ]}
      />,
    );
    expect(screen.getByText('Stale (34d)')).toBeInTheDocument();
    // All four check badges should show em-dash when stale.
    const dashBadges = screen.getAllByText('—');
    expect(dashBadges.length).toBe(4);
  });

  it('renders "Stale" with no day count when lastCheckIn is null', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeDevice({
            lastCheckIn: null,
            complianceStatus: 'stale',
            daysSinceLastCheckIn: null,
          }),
        ]}
      />,
    );
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('shows the Export CSV button when devices are present', () => {
    render(<DeviceAgentDevicesList devices={[makeDevice()]} />);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('calls the CSV download with the built rows when clicked', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeDevice({ name: 'Alpha', id: 'a' }),
          makeDevice({ name: 'Beta', id: 'b', complianceStatus: 'stale', daysSinceLastCheckIn: 10 }),
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    expect(mockDownload).toHaveBeenCalledTimes(1);
    const [filename, contents] = mockDownload.mock.calls[0];
    expect(filename).toMatch(/^devices-org_1-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(contents).toContain('Alpha');
    expect(contents).toContain('Beta');
    expect(contents).toContain('stale');
  });

  it('renders a stale-explainer tooltip trigger next to the Stale badge', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeDevice({ complianceStatus: 'stale', daysSinceLastCheckIn: 12 }),
        ]}
      />,
    );
    expect(
      screen.getByRole('button', { name: /What does Stale mean\?/i }),
    ).toBeInTheDocument();
  });

  it('renders the stale-explainer tooltip trigger when daysSinceLastCheckIn is null (never reported)', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeDevice({
            complianceStatus: 'stale',
            daysSinceLastCheckIn: null,
            lastCheckIn: null,
          }),
        ]}
      />,
    );
    expect(
      screen.getByRole('button', { name: /What does Stale mean\?/i }),
    ).toBeInTheDocument();
  });

  it('does not render the stale-explainer tooltip trigger for a compliant device', () => {
    render(<DeviceAgentDevicesList devices={[makeDevice({ complianceStatus: 'compliant' })]} />);
    expect(
      screen.queryByRole('button', { name: /What does Stale mean\?/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render the stale-explainer tooltip trigger for a non-compliant device', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeDevice({
            complianceStatus: 'non_compliant',
            isCompliant: false,
            diskEncryptionEnabled: false,
          }),
        ]}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /What does Stale mean\?/i }),
    ).not.toBeInTheDocument();
  });
});

function makeIntegrationDevice(
  overrides: Partial<DeviceWithChecks> = {},
): DeviceWithChecks {
  return makeDevice({
    id: 'dev_int',
    name: 'Imported Mac',
    // Imported devices carry no real compliance data — defaults are all false.
    isCompliant: false,
    diskEncryptionEnabled: false,
    antivirusEnabled: false,
    passwordPolicySet: false,
    screenLockEnabled: false,
    agentVersion: null,
    hasActiveAgentSession: false,
    // Even though lastCheckIn (= last sync) is fresh, the server still derives
    // non_compliant; the UI must override this to "Not tracked" by source.
    complianceStatus: 'non_compliant',
    source: 'integration',
    integrationProvider: { slug: 'kandji', name: 'Kandji' },
    ...overrides,
  });
}

describe('DeviceAgentDevicesList — integration-imported devices', () => {
  it('labels the device with its integration provider in the Source column', () => {
    render(<DeviceAgentDevicesList devices={[makeIntegrationDevice()]} />);
    expect(screen.getByText('Kandji')).toBeInTheDocument();
  });

  it('shows "Not tracked" compliance instead of a false "No"', () => {
    render(<DeviceAgentDevicesList devices={[makeIntegrationDevice()]} />);
    expect(screen.getByText('Not tracked')).toBeInTheDocument();
    expect(screen.queryByText('No')).not.toBeInTheDocument();
    expect(screen.queryByText('Yes')).not.toBeInTheDocument();
  });

  it('renders the "not tracked" explainer tooltip trigger', () => {
    render(<DeviceAgentDevicesList devices={[makeIntegrationDevice()]} />);
    expect(
      screen.getByRole('button', { name: /Why is compliance not tracked\?/i }),
    ).toBeInTheDocument();
  });

  it('presents an imported device as Online when the provider saw it recently', () => {
    // lastCheckIn carries the PROVIDER's last-contact timestamp for imported
    // devices (device sync lastSeenAt), so the live dot applies honestly.
    render(
      <DeviceAgentDevicesList
        devices={[makeIntegrationDevice({ lastCheckIn: new Date().toISOString() })]}
      />,
    );
    expect(screen.getByTitle('Online')).toBeInTheDocument();
  });

  it('presents an imported device as Offline when the provider has not seen it recently', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <DeviceAgentDevicesList
        devices={[makeIntegrationDevice({ lastCheckIn: threeDaysAgo })]}
      />,
    );
    expect(screen.getByTitle('Offline')).toBeInTheDocument();
  });

  it('shows the SOURCE-reported verdict and named checks when the provider reports them', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeIntegrationDevice({
            integrationProvider: { slug: 'intune', name: 'Microsoft Intune' },
            sourceCompliance: {
              isCompliant: true,
              checks: [
                { id: 'disk_encryption', label: 'Disk Encryption', passed: true },
                { id: 'firewall', label: 'Firewall', passed: false },
              ],
            },
          }),
        ]}
      />,
    );
    // Verdict shown instead of "Not tracked", with provider attribution.
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.queryByText('Not tracked')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Where does this compliance status come from\?/i }),
    ).toBeInTheDocument();
    // Provider-named check badges, pass and fail.
    expect(screen.getByText('Disk Encryption')).toBeInTheDocument();
    expect(screen.getByText('Firewall')).toBeInTheDocument();
  });

  it('shows "No" when the source reports non-compliant', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeIntegrationDevice({
            sourceCompliance: { isCompliant: false },
          }),
        ]}
      />,
    );
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.queryByText('Not tracked')).not.toBeInTheDocument();
  });

  it('keeps "Not tracked" when the source reports checks but no verdict', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeIntegrationDevice({
            sourceCompliance: {
              checks: [{ id: 'os_up_to_date', label: 'OS up to date', passed: true }],
            },
          }),
        ]}
      />,
    );
    // Checks render, but with no overall verdict the compliance column stays honest.
    expect(screen.getByText('OS up to date')).toBeInTheDocument();
    expect(screen.getByText('Not tracked')).toBeInTheDocument();
  });

  it('renders a source filter only when more than one source is present', () => {
    const { rerender } = render(
      <DeviceAgentDevicesList devices={[makeDevice()]} />,
    );
    expect(screen.queryByLabelText('Filter by source')).not.toBeInTheDocument();

    rerender(
      <DeviceAgentDevicesList
        devices={[makeDevice(), makeIntegrationDevice()]}
      />,
    );
    expect(screen.getByLabelText('Filter by source')).toBeInTheDocument();
  });

  it('filters the table to a single source when selected', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeDevice({ id: 'a', name: 'Agent Mac' }),
          makeIntegrationDevice({ id: 'b', name: 'Imported Mac' }),
        ]}
      />,
    );
    expect(screen.getByText('Agent Mac')).toBeInTheDocument();
    expect(screen.getByText('Imported Mac')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by source'), {
      target: { value: 'integration:kandji' },
    });
    expect(screen.queryByText('Agent Mac')).not.toBeInTheDocument();
    expect(screen.getByText('Imported Mac')).toBeInTheDocument();
  });

  it('keeps distinct providers separate in the filter even with the same display name', () => {
    render(
      <DeviceAgentDevicesList
        devices={[
          makeIntegrationDevice({
            id: 'x',
            name: 'Device X',
            integrationProvider: { slug: 'kandji', name: 'MDM' },
          }),
          makeIntegrationDevice({
            id: 'y',
            name: 'Device Y',
            integrationProvider: { slug: 'intune', name: 'MDM' },
          }),
        ]}
      />,
    );
    const select = screen.getByLabelText('Filter by source');
    // "All sources" + two distinct providers (not merged into one "MDM").
    expect(within(select).getAllByRole('option')).toHaveLength(3);
    fireEvent.change(select, { target: { value: 'integration:intune' } });
    expect(screen.queryByText('Device X')).not.toBeInTheDocument();
    expect(screen.getByText('Device Y')).toBeInTheDocument();
  });
});
