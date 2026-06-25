jest.mock('@db', () => ({
  db: { findingException: { findMany: jest.fn() } },
}));

import { db } from '@db';
import {
  ActiveExceptionSet,
  loadActiveExceptionSet,
} from './finding-exceptions';

const findMany = jest.mocked(db.findingException.findMany);

describe('ActiveExceptionSet', () => {
  it('matches by (connectionId, checkId, resourceId)', () => {
    const set = new ActiveExceptionSet([
      ActiveExceptionSet.key('c1', 'aws-s3-public-access', 'bucket-1'),
    ]);
    expect(set.has('c1', 'aws-s3-public-access', 'bucket-1')).toBe(true);
    expect(set.has('c1', 'aws-s3-public-access', 'bucket-2')).toBe(false);
    expect(set.has('c2', 'aws-s3-public-access', 'bucket-1')).toBe(false);
    expect(set.size).toBe(1);
  });

  it('exposes excepted resourceIds grouped by (connectionId, checkId)', () => {
    const set = new ActiveExceptionSet([
      ActiveExceptionSet.key('c1', 'check-a', 'r1'),
      ActiveExceptionSet.key('c1', 'check-a', 'r2'),
      ActiveExceptionSet.key('c1', 'check-b', 'r3'),
    ]);
    expect(new Set(set.exceptedResourceIds('c1', 'check-a'))).toEqual(
      new Set(['r1', 'r2']),
    );
    expect(set.exceptedResourceIds('c1', 'check-b')).toEqual(['r3']);
    // Nothing excepted for this pair → empty (callers skip the count query).
    expect(set.exceptedResourceIds('c1', 'check-c')).toEqual([]);
    expect(set.exceptedResourceIds('c2', 'check-a')).toEqual([]);
  });

  it('reconstructs resourceIds that themselves contain the "::" delimiter', () => {
    const resourceId = 'arn:aws:s3:::my::weird::bucket';
    const set = new ActiveExceptionSet([
      ActiveExceptionSet.key('c1', 'check-a', resourceId),
    ]);
    expect(set.has('c1', 'check-a', resourceId)).toBe(true);
    expect(set.exceptedResourceIds('c1', 'check-a')).toEqual([resourceId]);
  });
});

describe('loadActiveExceptionSet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('builds the set from active exceptions', async () => {
    findMany.mockResolvedValue([
      {
        connectionId: 'c1',
        checkId: 'aws-s3-public-access',
        resourceId: 'bucket-1',
      },
    ] as never);

    const set = await loadActiveExceptionSet('org_1');

    expect(set.has('c1', 'aws-s3-public-access', 'bucket-1')).toBe(true);
    // Query only active exceptions (not revoked, not expired).
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org_1',
          revokedAt: null,
        }),
      }),
    );
  });

  it('fail-safe: returns an empty set if the lookup throws (suppress nothing)', async () => {
    findMany.mockRejectedValue(new Error('db down'));
    const set = await loadActiveExceptionSet('org_1');
    expect(set.size).toBe(0);
    expect(set.has('c1', 'aws-s3-public-access', 'bucket-1')).toBe(false);
  });
});
