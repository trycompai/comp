import { decideRunStatus } from './task-check-evaluation';

describe('decideRunStatus', () => {
  // Static / AWS / GCP / Azure — isDynamic=false → never held; historical mapping
  // (error → failed, else raw status).
  describe('non-dynamic (never held)', () => {
    it('success → success', () => {
      expect(decideRunStatus({ resultStatus: 'success', isDynamic: false })).toBe('success');
    });
    it('failed → failed', () => {
      expect(decideRunStatus({ resultStatus: 'failed', isDynamic: false })).toBe('failed');
    });
    it('execution error → failed', () => {
      expect(decideRunStatus({ resultStatus: 'error', isDynamic: false })).toBe('failed');
    });
  });

  // Dynamic — comp does NO classification: EVERY non-success is held as
  // 'inconclusive' ("pending") and handed to the self-heal agent, the only
  // decider of our-bug (fix) vs real fail (show). No error-code logic at all.
  describe('dynamic (everything non-success → pending)', () => {
    it('success → success', () => {
      expect(decideRunStatus({ resultStatus: 'success', isDynamic: true })).toBe('success');
    });
    it('failed (a finding, a customer error, anything) → inconclusive (pending)', () => {
      expect(decideRunStatus({ resultStatus: 'failed', isDynamic: true })).toBe('inconclusive');
    });
    it('execution error → inconclusive (pending)', () => {
      expect(decideRunStatus({ resultStatus: 'error', isDynamic: true })).toBe('inconclusive');
    });
  });
});
