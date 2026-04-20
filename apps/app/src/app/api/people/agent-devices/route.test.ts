import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('@db/server', () => ({
  db: {
    device: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { GET } from './route';

const mockedGetSession = vi.mocked(auth.api.getSession);
const mockedFindMany = vi.mocked(
  (db as unknown as { device: { findMany: ReturnType<typeof vi.fn> } }).device.findMany,
);

// Freeze "now" so day math is deterministic.
const FIXED_NOW = new Date('2026-04-17T12:00:00.000Z');

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetSession.mockResolvedValue({
    session: { activeOrganizationId: 'org_1' },
  } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);
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
  it('returns 401 when no organization is active', async () => {
    mockedGetSession.mockResolvedValue({ session: {} } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('marks a fresh + isCompliant device as compliant', async () => {
    mockedFindMany.mockResolvedValue([deviceRow({ lastCheckIn: new Date(FIXED_NOW) })]);
    const res = await GET();
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
    const res = await GET();
    const body = await res.json();
    expect(body.data[0].complianceStatus).toBe('non_compliant');
  });

  it('marks a device with lastCheckIn >= 7 days ago as stale', async () => {
    const eightDaysAgo = new Date(FIXED_NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
    mockedFindMany.mockResolvedValue([deviceRow({ lastCheckIn: eightDaysAgo })]);
    const res = await GET();
    const body = await res.json();
    expect(body.data[0].complianceStatus).toBe('stale');
    expect(body.data[0].daysSinceLastCheckIn).toBe(8);
  });

  it('marks a device with null lastCheckIn as stale', async () => {
    mockedFindMany.mockResolvedValue([deviceRow({ lastCheckIn: null })]);
    const res = await GET();
    const body = await res.json();
    expect(body.data[0].complianceStatus).toBe('stale');
    expect(body.data[0].daysSinceLastCheckIn).toBeNull();
  });
});
