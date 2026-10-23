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
        makeAgentDevice({ memberId: 'mem_1', complianceStatus: 'compliant' }),
        makeAgentDevice({ memberId: 'mem_1', complianceStatus: 'compliant' }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('compliant');
  });

  it('returns non-compliant when any agent device is non_compliant', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({ memberId: 'mem_1', complianceStatus: 'compliant' }),
        makeAgentDevice({ memberId: 'mem_1', complianceStatus: 'non_compliant' }),
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

  it('returns compliant when a compliant and a stale device are mixed', () => {
    // An actively-reporting compliant device beats an old/abandoned device
    // that hasn't checked in — otherwise the People table contradicts the
    // per-device list, which still shows the active device as compliant.
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({ memberId: 'mem_1', complianceStatus: 'compliant' }),
        makeAgentDevice({
          memberId: 'mem_1',
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 8,
        }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('compliant');
  });

  it('returns compliant when a stale device precedes a compliant one', () => {
    // Sibling-order regression: encountering the stale device first must
    // not lock the member into stale once a compliant device shows up.
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 8,
        }),
        makeAgentDevice({ memberId: 'mem_1', complianceStatus: 'compliant' }),
      ],
      fleetHosts: [],
      complianceMemberIds: ['mem_1'],
    });
    expect(map.mem_1).toBe('compliant');
  });

  it('prefers non-compliant over stale when both present', () => {
    const map = computeDeviceStatusMap({
      agentDevices: [
        makeAgentDevice({
          memberId: 'mem_1',
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 10,
        }),
        makeAgentDevice({ memberId: 'mem_1', complianceStatus: 'non_compliant' }),
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
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 10,
        }),
        makeAgentDevice({
          memberId: 'mem_1',
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
