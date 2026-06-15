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
