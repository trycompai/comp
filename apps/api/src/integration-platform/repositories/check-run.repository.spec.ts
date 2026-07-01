jest.mock('@db', () => ({
  db: {
    integrationCheckRun: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    integrationCheckResult: {
      count: jest.fn(),
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
const mockResultCount = (
  db.integrationCheckResult as unknown as { count: jest.Mock }
).count;
const mockFindFirst = (
  db.integrationCheckRun as unknown as { findFirst: jest.Mock }
).findFirst;
const mockResultFindMany = (
  db.integrationCheckResult as unknown as { findMany: jest.Mock }
).findMany;

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

  it('excludes disconnected connections and held (inconclusive) runs in both queries', async () => {
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
      // Held runs are never surfaced to the customer.
      expect(call[0].where.status).toEqual({ not: 'inconclusive' });
    }
    // groupBy must exclude held runs too, so a check with ONLY held runs yields
    // no group → that account shows "not run yet", never a red.
    for (const call of mockGroupBy.mock.calls) {
      expect(call[0].where.status).toEqual({ not: 'inconclusive' });
    }
  });

  it('loads a BOUNDED, findings-first result window per run — never all results (CS-588)', async () => {
    // A check can produce tens of thousands of results (e.g. a Firebase B2C
    // tenant, one per auth user). Eager-loading every result (`results: true`)
    // hydrates the whole set into memory and hangs/OOMs the request. Both
    // queries must instead use a per-run `take` so the DB caps the load.
    mockGroupBy.mockResolvedValue([
      {
        connectionId: 'A',
        checkId: 'firebase-employee-access',
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

    expect(mockFindMany.mock.calls.length).toBeGreaterThan(0);
    for (const call of mockFindMany.mock.calls) {
      const resultsInclude = call[0].include.results;
      // NOT `results: true` (which loads every row).
      expect(resultsInclude).not.toBe(true);
      // A finite per-run cap is applied at the DB.
      expect(typeof resultsInclude.take).toBe('number');
      expect(resultsInclude.take).toBeGreaterThan(0);
      expect(resultsInclude.take).toBeLessThanOrEqual(100);
      // Findings-first so the UI's findings still surface when truncated.
      expect(resultsInclude.orderBy).toEqual([
        { passed: 'asc' },
        { collectedAt: 'asc' },
      ]);
    }
  });

  it('clamps an oversized historyPerGroup to the cap (no unbounded read)', async () => {
    mockGroupBy.mockResolvedValue([
      {
        connectionId: 'A',
        checkId: 'c',
        _max: { createdAt: new Date('2026-06-09T15:00:00Z') },
      },
    ]);
    mockFindMany.mockResolvedValue([]);

    await repo.findLatestPerConnectionAndCheckByTask('task_1', {
      historyPerGroup: 100000,
    });

    // recent-window query = the findMany WITHOUT an OR clause.
    const recentCall = mockFindMany.mock.calls.find((c) => !c[0].where.OR);
    expect(recentCall?.[0].take).toBe(1 * 50); // groups.length(1) * MAX(50)
  });

  it('falls back to the default for an invalid historyPerGroup (NaN/negative)', async () => {
    mockGroupBy.mockResolvedValue([
      {
        connectionId: 'A',
        checkId: 'c',
        _max: { createdAt: new Date('2026-06-09T15:00:00Z') },
      },
    ]);
    mockFindMany.mockResolvedValue([]);

    await repo.findLatestPerConnectionAndCheckByTask('task_1', {
      historyPerGroup: Number.NaN,
    });
    let recentCall = mockFindMany.mock.calls.find((c) => !c[0].where.OR);
    expect(recentCall?.[0].take).toBe(1 * 5); // default 5

    mockFindMany.mockClear();
    await repo.findLatestPerConnectionAndCheckByTask('task_1', {
      historyPerGroup: -10,
    });
    recentCall = mockFindMany.mock.calls.find((c) => !c[0].where.OR);
    expect(recentCall?.[0].take).toBe(1 * 5); // default 5
  });
});

describe('CheckRunRepository.countExceptedFailures', () => {
  const repo = new CheckRunRepository();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('short-circuits (no query) when there are no excepted resourceIds', async () => {
    const result = await repo.countExceptedFailures('icr_1', []);
    expect(result).toBe(0);
    expect(mockResultCount).not.toHaveBeenCalled();
  });

  it('counts only this run’s FAILING results matching the excepted resourceIds', async () => {
    mockResultCount.mockResolvedValue(2);

    const result = await repo.countExceptedFailures('icr_1', ['b1', 'b2']);

    expect(result).toBe(2);
    expect(mockResultCount).toHaveBeenCalledWith({
      where: {
        checkRunId: 'icr_1',
        passed: false,
        resourceId: { in: ['b1', 'b2'] },
      },
    });
  });
});

describe('CheckRunRepository.findLatestUserResultsByConnectionAndCheck', () => {
  const repo = new CheckRunRepository();
  const params = {
    connectionId: 'conn_1',
    checkId: 'two-factor-auth',
    organizationId: 'org_1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null and never loads results when there is no real run', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await repo.findLatestUserResultsByConnectionAndCheck(params);

    expect(result).toBeNull();
    expect(mockResultFindMany).not.toHaveBeenCalled();
  });

  it('scopes the run to org + connection + check, excluding held runs and disconnected connections', async () => {
    mockFindFirst.mockResolvedValue({ id: 'run_1' });
    mockResultFindMany.mockResolvedValue([]);

    await repo.findLatestUserResultsByConnectionAndCheck(params);

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        connectionId: 'conn_1',
        checkId: 'two-factor-auth',
        // Held (inconclusive) runs must never surface to the customer.
        status: { not: 'inconclusive' },
        connection: {
          organizationId: 'org_1',
          status: { not: 'disconnected' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('loads the FULL per-user result set for the latest run — no take cap', async () => {
    mockFindFirst.mockResolvedValue({ id: 'run_1' });
    const rows = [
      { id: 'icx_1', resourceId: 'a@x.com', passed: true },
      { id: 'icx_2', resourceId: 'b@x.com', passed: false },
    ];
    mockResultFindMany.mockResolvedValue(rows);

    const result = await repo.findLatestUserResultsByConnectionAndCheck(params);

    expect(mockResultFindMany).toHaveBeenCalledWith({
      where: { checkRunId: 'run_1', resourceType: 'user' },
    });
    // Every user must map to a member — the 30-row display cap is NOT reused.
    expect(mockResultFindMany.mock.calls[0][0].take).toBeUndefined();
    expect(result).toEqual({ run: { id: 'run_1' }, results: rows });
  });
});
