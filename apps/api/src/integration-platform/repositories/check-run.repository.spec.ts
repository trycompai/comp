jest.mock('@db', () => ({
  db: {
    integrationCheckRun: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { db } from '@db';
import { CheckRunRepository } from './check-run.repository';

// Grab through the module reference to avoid the `unbound-method` lint rule
// that fires when extracting an instance method from an object literal.
const mockedCheckRun = db.integrationCheckRun as unknown as {
  groupBy: jest.Mock;
  findMany: jest.Mock;
};
const mockGroupBy = mockedCheckRun.groupBy;
const mockFindMany = mockedCheckRun.findMany;

function makeRun(opts: {
  id: string;
  connectionId: string;
  checkId?: string;
  createdAt: string;
}) {
  return {
    id: opts.id,
    connectionId: opts.connectionId,
    checkId: opts.checkId ?? 'aws-s3-encryption',
    createdAt: new Date(opts.createdAt),
    results: [],
    connection: {
      id: opts.connectionId,
      metadata: {},
      provider: { slug: 'aws' },
    },
  };
}

describe('CheckRunRepository.findLatestPerConnectionAndCheckByTask', () => {
  const repo = new CheckRunRepository();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns nothing when the task has no runs', async () => {
    mockGroupBy.mockResolvedValue([]);
    const result = await repo.findLatestPerConnectionAndCheckByTask('task_1');
    expect(result).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('GUARANTEES every account’s latest run even when one account dominates the recent window', async () => {
    // 3 accounts (A, B, C) each ran the same check once; A was then re-run many
    // times most recently. A flat "newest N rows" limit would bury B and C.
    mockGroupBy.mockResolvedValue([
      {
        connectionId: 'A',
        checkId: 'aws-s3-encryption',
        _max: { createdAt: new Date('2026-06-09T15:00:00Z') },
      },
      {
        connectionId: 'B',
        checkId: 'aws-s3-encryption',
        _max: { createdAt: new Date('2026-06-01T09:00:00Z') },
      },
      {
        connectionId: 'C',
        checkId: 'aws-s3-encryption',
        _max: { createdAt: new Date('2026-06-01T08:00:00Z') },
      },
    ]);

    const latestPerGroup = [
      makeRun({
        id: 'rA',
        connectionId: 'A',
        createdAt: '2026-06-09T15:00:00Z',
      }),
      makeRun({
        id: 'rB',
        connectionId: 'B',
        createdAt: '2026-06-01T09:00:00Z',
      }),
      makeRun({
        id: 'rC',
        connectionId: 'C',
        createdAt: '2026-06-01T08:00:00Z',
      }),
    ];
    // Recent window is dominated by account A's burst of re-runs.
    const recentWindow = [
      makeRun({
        id: 'rA',
        connectionId: 'A',
        createdAt: '2026-06-09T15:00:00Z',
      }),
      makeRun({
        id: 'rA2',
        connectionId: 'A',
        createdAt: '2026-06-09T14:00:00Z',
      }),
      makeRun({
        id: 'rA3',
        connectionId: 'A',
        createdAt: '2026-06-09T13:00:00Z',
      }),
      makeRun({
        id: 'rA4',
        connectionId: 'A',
        createdAt: '2026-06-09T12:00:00Z',
      }),
      makeRun({
        id: 'rA5',
        connectionId: 'A',
        createdAt: '2026-06-09T11:00:00Z',
      }),
    ];

    // First findMany = OR-of-tuples (latest per group); second = recent window.
    mockFindMany.mockImplementation((args: { where?: { OR?: unknown } }) =>
      Promise.resolve(args.where?.OR ? latestPerGroup : recentWindow),
    );

    const result = await repo.findLatestPerConnectionAndCheckByTask('task_1');
    const connectionIds = new Set(result.map((r) => r.connectionId));

    expect(connectionIds.has('A')).toBe(true);
    expect(connectionIds.has('B')).toBe(true);
    expect(connectionIds.has('C')).toBe(true);
    // Newest-first ordering preserved.
    expect(result[0].id).toBe('rA');
    // Deduped by id (rA appears in both the latest set and the recent window).
    expect(result.filter((r) => r.id === 'rA')).toHaveLength(1);
  });

  it('excludes disconnected connections in both queries', async () => {
    mockGroupBy.mockResolvedValue([
      {
        connectionId: 'A',
        checkId: 'c',
        _max: { createdAt: new Date('2026-06-09T15:00:00Z') },
      },
    ]);
    mockFindMany.mockResolvedValue([
      makeRun({
        id: 'rA',
        connectionId: 'A',
        createdAt: '2026-06-09T15:00:00Z',
      }),
    ]);

    await repo.findLatestPerConnectionAndCheckByTask('task_1');

    for (const call of mockFindMany.mock.calls) {
      expect(call[0].where.connection).toEqual({
        status: { not: 'disconnected' },
      });
    }
  });
});
