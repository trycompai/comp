import {
  MAX_EVIDENCE_BYTES,
  MAX_LOGS_PER_RUN,
  MAX_RESULTS_PER_CATEGORY,
  capEvidence,
  capLogs,
  capResultsForList,
} from './run-history-limits';

describe('run-history-limits', () => {
  describe('capResultsForList', () => {
    const make = (passed: boolean, excepted: boolean, id: number) => ({
      id,
      passed,
      excepted,
    });

    it('caps each category to MAX_RESULTS_PER_CATEGORY', () => {
      const results = [
        ...Array.from({ length: 5000 }, (_, i) => make(false, false, i)), // findings
        ...Array.from({ length: 5000 }, (_, i) => make(true, false, i)), // passing
        ...Array.from({ length: 50 }, (_, i) => make(false, true, i)), // excepted
      ];

      const capped = capResultsForList(results);

      const findings = capped.filter((r) => !r.passed && !r.excepted);
      const passing = capped.filter((r) => r.passed);
      const excepted = capped.filter((r) => r.excepted);

      expect(findings).toHaveLength(MAX_RESULTS_PER_CATEGORY);
      expect(passing).toHaveLength(MAX_RESULTS_PER_CATEGORY);
      expect(excepted).toHaveLength(MAX_RESULTS_PER_CATEGORY);
      expect(capped.length).toBe(MAX_RESULTS_PER_CATEGORY * 3);
    });

    it('preserves input order within each category', () => {
      const results = [
        make(false, false, 1),
        make(false, false, 2),
        make(false, false, 3),
      ];
      expect(capResultsForList(results).map((r) => r.id)).toEqual([1, 2, 3]);
    });

    it('returns everything when under the cap', () => {
      const results = [make(false, false, 1), make(true, false, 2)];
      expect(capResultsForList(results)).toHaveLength(2);
    });

    it('handles an empty array', () => {
      expect(capResultsForList([])).toEqual([]);
    });
  });

  describe('capEvidence', () => {
    it('passes through null and undefined unchanged', () => {
      expect(capEvidence(null)).toBeNull();
      expect(capEvidence(undefined)).toBeUndefined();
    });

    it('leaves normal-sized evidence intact', () => {
      const evidence = { user: 'jane', roles: ['admin'] };
      expect(capEvidence(evidence)).toBe(evidence);
    });

    it('replaces oversized evidence with a compact placeholder', () => {
      const big = { blob: 'x'.repeat(MAX_EVIDENCE_BYTES + 1) };
      const capped = capEvidence(big) as {
        truncated?: boolean;
        sizeBytes?: number;
      };
      expect(capped.truncated).toBe(true);
      expect(capped.sizeBytes).toBeGreaterThan(MAX_EVIDENCE_BYTES);
      // The huge original blob is NOT carried over.
      expect(JSON.stringify(capped).length).toBeLessThan(MAX_EVIDENCE_BYTES);
    });
  });

  describe('capLogs', () => {
    it('slices a long log array to MAX_LOGS_PER_RUN', () => {
      const logs = Array.from({ length: 5000 }, (_, i) => ({ message: `${i}` }));
      const capped = capLogs(logs);
      expect(Array.isArray(capped)).toBe(true);
      expect((capped as unknown[]).length).toBe(MAX_LOGS_PER_RUN);
    });

    it('passes through a short log array unchanged', () => {
      const logs = [{ message: 'a' }, { message: 'b' }];
      expect(capLogs(logs)).toHaveLength(2);
    });

    it('passes through non-array values (null) untouched', () => {
      expect(capLogs(null)).toBeNull();
    });
  });
});
