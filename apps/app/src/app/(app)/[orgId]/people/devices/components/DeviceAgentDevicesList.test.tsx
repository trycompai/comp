import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DeviceWithChecks } from '../types';

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1' }),
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
});
