import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/permissions.server', () => ({
  requireApiPermission: vi.fn(),
}));

vi.mock('@db/server', () => ({
  db: {
    device: {
      findMany: vi.fn(),
    },
    integrationConnection: {
      findMany: vi.fn(async () => []),
    },
  },
}));

import { requireApiPermission } from '@/lib/permissions.server';
import { db } from '@db/server';
import { GET } from './route';

const mockedRequire = vi.mocked(requireApiPermission);
const mockedFindMany = vi.mocked(
  (db as unknown as { device: { findMany: ReturnType<typeof vi.fn> } }).device.findMany,
);

// Freeze "now" so day math is deterministic.
const FIXED_NOW = new Date('2026-04-17T12:00:00.000Z');

function req() {
  return new Request('http://test/api/people/agent-devices');
}

function grant() {
  mockedRequire.mockResolvedValue({
    organizationId: 'org_1',
    userId: 'u_1',
    permissions: {},
  } as unknown as Awaited<ReturnType<typeof requireApiPermission>>);
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  grant();
});

function deviceRow(overrides: Partial<Record<string, unknown>> = {}) {
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
    lastCheckIn: new Date(FIXED_NOW),
    agentVersion: '1.0.0',
    installedAt: new Date('2026-01-01T00:00:00.000Z'),
    memberId: 'mem_1',
    member: { user: { name: 'A', email: 'a@example.com' } },
    ...overrides,
  };
}

describe('GET /api/people/agent-devices', () => {
  it('forwards the 401/403 response when the RBAC guard denies access', async () => {
    mockedRequire.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    );
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it('marks a fresh + isCompliant device as compliant', async () => {
    mockedFindMany.mockResolvedValue([deviceRow({ lastCheckIn: new Date(FIXED_NOW) })]);
    const res = await GET(req());
    const body = await res.json();
    expect(body.data[0].complianceStatus).toBe('compliant');
    expect(body.data[0].daysSinceLastCheckIn).toBe(0);
  });

  it('marks a fresh + !isCompliant device as non_compliant', async () => {
    mockedFindMany.mockResolvedValue([
      deviceRow({
        isCompliant: false,
        diskEncryptionEnabled: false,
        lastCheckIn: new Date(FIXED_NOW),
      }),
    ]);
    const res = await GET(req());
    const body = await res.json();
    expect(body.data[0].complianceStatus).toBe('non_compliant');
  });

  it('marks a device with lastCheckIn >= 7 days ago as stale', async () => {
    const eightDaysAgo = new Date(FIXED_NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
    mockedFindMany.mockResolvedValue([deviceRow({ lastCheckIn: eightDaysAgo })]);
    const res = await GET(req());
    const body = await res.json();
    expect(body.data[0].complianceStatus).toBe('stale');
    expect(body.data[0].daysSinceLastCheckIn).toBe(8);
  });

  it('marks a device with null lastCheckIn as stale', async () => {
    mockedFindMany.mockResolvedValue([deviceRow({ lastCheckIn: null })]);
    const res = await GET(req());
    const body = await res.json();
    expect(body.data[0].complianceStatus).toBe('stale');
    expect(body.data[0].daysSinceLastCheckIn).toBeNull();
  });

  it('returns hasActiveAgentSession=true for devices with an unexpired linked session, false otherwise', async () => {
    const future = new Date(FIXED_NOW.getTime() + 60 * 60 * 1000); // 1 hour ahead
    const past = new Date(FIXED_NOW.getTime() - 60 * 60 * 1000);   // 1 hour ago

    mockedFindMany.mockResolvedValue([
      deviceRow({ id: 'dev_active', agentSession: { expiresAt: future } }),
      deviceRow({ id: 'dev_none', agentSession: null }),
      deviceRow({ id: 'dev_expired', agentSession: { expiresAt: past } }),
    ]);

    const res = await GET(req());
    const body = await res.json();
    const byId = Object.fromEntries(
      body.data.map((d: { id: string }) => [d.id, d]),
    );

    expect(byId['dev_active'].hasActiveAgentSession).toBe(true);
    expect(byId['dev_none'].hasActiveAgentSession).toBe(false);
    expect(byId['dev_expired'].hasActiveAgentSession).toBe(false);
  });
});
