import { describe, expect, it } from 'vitest';
import type { DeviceWithChecks } from '../types';
import { buildDevicesCsv, DEVICES_CSV_HEADER } from './devices-csv';

function makeDevice(overrides: Partial<DeviceWithChecks> = {}): DeviceWithChecks {
  return {
    id: 'dev_1',
    name: 'MacBook',
    hostname: 'macbook',
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
    lastCheckIn: '2026-04-17T12:00:00.000Z',
    agentVersion: '1.2.0',
    installedAt: '2026-01-01T00:00:00.000Z',
    memberId: 'mem_1',
    user: { name: 'Jane Doe', email: 'jane@example.com' },
    source: 'device_agent',
    complianceStatus: 'compliant',
    daysSinceLastCheckIn: 0,
    ...overrides,
  };
}

describe('buildDevicesCsv', () => {
  it('emits the fixed header row', () => {
    const csv = buildDevicesCsv([]);
    expect(csv).toBe(DEVICES_CSV_HEADER + '\n');
  });

  it('renders a compliant device in column order', () => {
    const csv = buildDevicesCsv([makeDevice()]);
    const [header, row] = csv.trim().split('\n');
    expect(header).toBe(DEVICES_CSV_HEADER);
    expect(row).toBe(
      [
        'MacBook',
        'Jane Doe',
        'jane@example.com',
        'macos',
        '14.0',
        '1.2.0',
        '2026-04-17T12:00:00.000Z',
        '0',
        'compliant',
        'yes',
        'yes',
        'yes',
        'yes',
      ].join(','),
    );
  });

  it('uses "no" for failing checks and stale status when applicable', () => {
    const csv = buildDevicesCsv([
      makeDevice({
        complianceStatus: 'stale',
        daysSinceLastCheckIn: 51,
        diskEncryptionEnabled: false,
        antivirusEnabled: false,
      }),
    ]);
    const row = csv.trim().split('\n')[1];
    const cells = row.split(',');
    expect(cells).toContain('stale');
    expect(cells[7]).toBe('51'); // days since sync
    expect(cells.slice(-4)).toEqual(['no', 'no', 'yes', 'yes']);
  });

  it('represents never-synced devices with empty last-check-in and empty days', () => {
    const csv = buildDevicesCsv([
      makeDevice({
        lastCheckIn: null,
        daysSinceLastCheckIn: null,
        complianceStatus: 'stale',
      }),
    ]);
    const cells = csv.trim().split('\n')[1].split(',');
    expect(cells[6]).toBe(''); // last check-in
    expect(cells[7]).toBe(''); // days since sync
    expect(cells[8]).toBe('stale');
  });

  it('escapes commas, quotes, and newlines per RFC 4180', () => {
    const csv = buildDevicesCsv([
      makeDevice({
        name: 'Device, "quoted"',
        user: { name: 'Line1\nLine2', email: 'x@y.com' },
      }),
    ]);
    const row = csv.trim().split('\n').slice(1).join('\n'); // multi-line row is still one row
    expect(row.startsWith('"Device, ""quoted"""')).toBe(true);
    expect(row).toContain('"Line1\nLine2"');
  });

  it('handles multiple rows', () => {
    const csv = buildDevicesCsv([
      makeDevice({ id: 'a', name: 'Alpha' }),
      makeDevice({ id: 'b', name: 'Beta', complianceStatus: 'non_compliant' }),
    ]);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith('Alpha,')).toBe(true);
    expect(lines[2].startsWith('Beta,')).toBe(true);
  });
});
