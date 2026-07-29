import { describe, expect, it } from 'vitest';

import type { DeviceWithChecks, Host } from '../../devices/types';
import { computeDeviceStatusMap } from './compute-device-status-map';

function makeAgentDevice(overrides: Partial<DeviceWithChecks> = {}): DeviceWithChecks {
  return {
    id: `dev_${Math.random().toString(36).slice(2)}`,
    name: 'Laptop',
    hostname: 'laptop',
    platform: 'macos',
    osVersion: '14.0',
    serialNumber: 'SN',
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
    user: { name: 'A', email: 'a@example.com' },
    source: 'device_agent',
    complianceStatus: 'compliant',
    daysSinceLastCheckIn: 0,
    hasActiveAgentSession: false,
    ...overrides,
  };
}

function makeFleetHost(overrides: Partial<Host> = {}): Host {
  return {
    id: Math.floor(Math.random() * 10000),
    member_id: 'mem_2',
    policies: [{ id: 1, name: 'Disk Encryption', response: 'pass' }],
    ...overrides,
  } as unknown as Host;
}

describe('computeDeviceStatusMap', () => {
  it('returns not-installed for members with no device', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [],
      fleetHosts: [],
      complianceMemberIds: ['mem_1', 'mem_2'],
    });
    expect(map).toEqual({ mem_1: 'not-installed', mem_2: 'not-installed' });
  });

  it('returns compliant when all agent devices for a member are compliant', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'laptop',
          complianceStatus: 'compliant',
        }),
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'desktop',
          complianceStatus: 'compliant',
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('compliant');
  });

  it('returns non-compliant when any agent device is non_compliant', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'laptop',
          complianceStatus: 'compliant',
        }),
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'desktop',
          complianceStatus: 'non_compliant',
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('non-compliant');
  });

  it('returns stale when the only agent device is stale', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 15,
          isCompliant: true, // raw field — should NOT matter
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('stale');
  });

  it('returns stale when a compliant and a stale device are mixed', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'laptop',
          complianceStatus: 'compliant',
        }),
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'desktop',
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 8,
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('stale');
  });

  it('prefers non-compliant over stale when both present', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'laptop',
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 10,
        }),
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'desktop',
          complianceStatus: 'non_compliant',
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('non-compliant');
  });

  it('returns stale when all devices are stale', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'laptop',
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 10,
        }),
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'desktop',
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 20,
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('stale');
  });

  it('falls back to Fleet policy status when no agent device is present', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [],
      fleetHosts: [
        makeFleetHost({
          member_id: 'mem_1',
          policies: [
            { id: 1, name: 'Enc', response: 'pass' },
            { id: 2, name: 'AV', response: 'pass' },
          ],
        }),
      ],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('compliant');
  });

  it('prefers agent device status over fleet for the same member', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 10,
        }),
      ],
      fleetHosts: [
        makeFleetHost({
          member_id: 'mem_1',
          policies: [{ id: 1, name: 'Enc', response: 'pass' }],
        }),
      ],
      complianceMemberIds: ['mem_1'],
    });
    // Agent says stale → member is stale, even if fleet would say compliant.
    expect(map.mem_1).toBe('stale');
  });

  it('keeps a member non-compliant when a failing fleet host precedes a passing one', () => {
    // Regression test for a fleet-loop last-host-wins bug: a passing host
    // encountered after a failing one for the same member must not overwrite
    // non-compliant with compliant.
    const map = computeDeviceStatusMap({
      agentDevices: [],
      fleetHosts: [
        makeFleetHost({
          member_id: 'mem_1',
          policies: [{ id: 1, name: 'Disk Enc', response: 'fail' }],
        }),
        makeFleetHost({
          member_id: 'mem_1',
          policies: [{ id: 2, name: 'Antivirus', response: 'pass' }],
        }),
      ],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('non-compliant');
  });

  it('keeps a member non-compliant when a passing fleet host precedes a failing one', () => {
    // Sibling order — the passing host runs first; the later failing host
    // must still flip the member to non-compliant.
    const map = computeDeviceStatusMap({
      agentDevices: [],
      fleetHosts: [
        makeFleetHost({
          member_id: 'mem_1',
          policies: [{ id: 1, name: 'Antivirus', response: 'pass' }],
        }),
        makeFleetHost({
          member_id: 'mem_1',
          policies: [{ id: 2, name: 'Disk Enc', response: 'fail' }],
        }),
      ],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('non-compliant');
  });

  it('ignores the superseded duplicate row for a machine (CS-791)', () => {
    // Two rows for ONE machine: the original went stale once registration moved
    // the agent's check-ins to the newer row. Rolling both up worst-wins read
    // "Missing" on People while the employee's Device tab — which takes the
    // newest installedAt row — read "Compliant". Only the newest row counts.
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'seans-macbook.local',
          serialNumber: 'ABC123',
          installedAt: '2026-01-10T00:00:00.000Z',
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 30,
        }),
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'seans-macbook.local',
          serialNumber: null,
          installedAt: '2026-06-02T00:00:00.000Z',
          complianceStatus: 'compliant',
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('compliant');
  });

  it('ignores the superseded duplicate whichever order it arrives in', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'seans-macbook.local',
          installedAt: '2026-06-02T00:00:00.000Z',
          complianceStatus: 'compliant',
        }),
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'Seans-MacBook.local',
          installedAt: '2026-01-10T00:00:00.000Z',
          complianceStatus: 'non_compliant',
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('compliant');
  });

  it('does not let one member’s duplicate hide another member’s machine', () => {
    // The dedupe key is per member: two people can share a hostname.
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'laptop',
          installedAt: '2026-06-02T00:00:00.000Z',
          complianceStatus: 'compliant',
        }),
        makeAgentDevice({
          memberId: 'mem_2',
          hostname: 'laptop',
          installedAt: '2026-01-10T00:00:00.000Z',
          complianceStatus: 'non_compliant',
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1', 'mem_2'],
    });
    expect(map).toEqual({ mem_1: 'compliant', mem_2: 'non-compliant' });
  });

  it('lets the agent row win over an imported row for the same machine', () => {
    // The imported row is filtered out before the dedupe, so it can never
    // shadow the agent row and drop the member to not-installed.
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'laptop',
          installedAt: '2026-06-02T00:00:00.000Z',
          source: 'integration',
          complianceStatus: 'stale',
        }),
        makeAgentDevice({
          memberId: 'mem_1',
          hostname: 'laptop',
          installedAt: '2026-01-10T00:00:00.000Z',
          complianceStatus: 'compliant',
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('compliant');
  });

  it('ignores devices for members not in the compliance set', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({ memberId: 'mem_admin', complianceStatus: 'non_compliant' }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map).toEqual({ mem_1: 'not-installed' });
  });
});
