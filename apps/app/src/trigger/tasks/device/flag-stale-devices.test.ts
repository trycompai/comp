import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@db/server', () => ({
  db: {
    device: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@trigger.dev/sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  schedules: {
    task: (config: { run: (payload: unknown) => Promise<unknown> }) => config,
  },
}));

import { db } from '@db/server';
import { flagStaleDevices } from './flag-stale-devices';

const FIXED_NOW = new Date('2026-04-17T12:00:00.000Z');

const task = flagStaleDevices as unknown as {
  run: (payload: unknown) => Promise<{
    success: boolean;
    flaggedCount: number;
    threshold: Date;
    error?: string;
  }>;
};

const mockUpdateMany = vi.mocked(
  (db as unknown as { device: { updateMany: ReturnType<typeof vi.fn> } }).device.updateMany,
);

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('flagStaleDevices', () => {
  it('flips compliant devices older than 7 days to isCompliant = false', async () => {
    mockUpdateMany.mockResolvedValue({ count: 3 });

    const result = await task.run({});

    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    const call = mockUpdateMany.mock.calls[0][0] as {
      where: {
        isCompliant: boolean;
        OR: Array<{ lastCheckIn: null | { lt: Date } }>;
      };
      data: { isCompliant: boolean };
    };

    expect(call.where.isCompliant).toBe(true);
    expect(call.data).toEqual({ isCompliant: false });

    // Threshold is 7 days before FIXED_NOW.
    const expectedThreshold = new Date(FIXED_NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ltClause = call.where.OR.find((c) => c.lastCheckIn && 'lt' in c.lastCheckIn);
    expect(ltClause).toBeDefined();
    expect((ltClause!.lastCheckIn as { lt: Date }).lt.toISOString()).toBe(
      expectedThreshold.toISOString(),
    );

    // Null-lastCheckIn clause is also present.
    const nullClause = call.where.OR.find((c) => c.lastCheckIn === null);
    expect(nullClause).toBeDefined();

    expect(result.success).toBe(true);
    expect(result.flaggedCount).toBe(3);
  });

  it('reports zero when nothing matches', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });

    const result = await task.run({});

    expect(result.success).toBe(true);
    expect(result.flaggedCount).toBe(0);
  });

  it('returns success: false when the update throws', async () => {
    mockUpdateMany.mockRejectedValue(new Error('db down'));

    const result = await task.run({});

    expect(result.success).toBe(false);
    expect(result.flaggedCount).toBe(0);
    expect(result.error).toBe('db down');
  });
});
