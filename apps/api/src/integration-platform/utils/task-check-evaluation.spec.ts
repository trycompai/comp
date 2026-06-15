// ActiveExceptionSet's module imports `db`; mock it (this suite only uses the
// pure class, not the DB-backed loader).
jest.mock('@db', () => ({ db: {} }));

import { ActiveExceptionSet } from '../../cloud-security/finding-exceptions';
import {
  countEffectiveFailures,
  decideTaskStatus,
} from './task-check-evaluation';

describe('task-check-evaluation', () => {
  const failing = [
    { connectionId: 'c1', checkId: 'chk', resourceId: 'r1' },
    { connectionId: 'c1', checkId: 'chk', resourceId: 'r2' },
  ];

  describe('countEffectiveFailures', () => {
    it('counts every failure when there are no exceptions', () => {
      expect(countEffectiveFailures(failing, new ActiveExceptionSet([]))).toBe(
        2,
      );
    });

    it('excludes a failure that is excepted', () => {
      const ex = new ActiveExceptionSet([
        ActiveExceptionSet.key('c1', 'chk', 'r2'),
      ]);
      expect(countEffectiveFailures(failing, ex)).toBe(1);
    });

    it('is zero when every failure is excepted', () => {
      const ex = new ActiveExceptionSet([
        ActiveExceptionSet.key('c1', 'chk', 'r1'),
        ActiveExceptionSet.key('c1', 'chk', 'r2'),
      ]);
      expect(countEffectiveFailures(failing, ex)).toBe(0);
    });

    it('does not match an exception for a different connection/check', () => {
      const ex = new ActiveExceptionSet([
        ActiveExceptionSet.key('OTHER', 'chk', 'r1'),
        ActiveExceptionSet.key('c1', 'OTHER', 'r2'),
      ]);
      expect(countEffectiveFailures(failing, ex)).toBe(2);
    });

    it('is provider-agnostic — works for AWS, GCP and Azure findings', () => {
      const mixed = [
        {
          connectionId: 'aws_c',
          checkId: 'aws-s3-public-access',
          resourceId: 'bucket',
        },
        {
          connectionId: 'gcp_c',
          checkId: 'gcp-storage-no-public-access',
          resourceId: 'gs-bucket',
        },
        {
          connectionId: 'az_c',
          checkId: 'azure-storage-secure-transfer',
          resourceId: 'sa1',
        },
      ];
      // Except only the GCP finding.
      const ex = new ActiveExceptionSet([
        ActiveExceptionSet.key(
          'gcp_c',
          'gcp-storage-no-public-access',
          'gs-bucket',
        ),
      ]);
      expect(countEffectiveFailures(mixed, ex)).toBe(2);
    });
  });

  describe('decideTaskStatus', () => {
    it('failed when there is a real (non-excepted) failure', () => {
      expect(decideTaskStatus(1, 5)).toBe('failed');
    });
    it('done when no failures and something passed', () => {
      expect(decideTaskStatus(0, 5)).toBe('done');
    });
    it('null (leave unchanged) when nothing failed and nothing passed', () => {
      expect(decideTaskStatus(0, 0)).toBeNull();
    });
  });
});
