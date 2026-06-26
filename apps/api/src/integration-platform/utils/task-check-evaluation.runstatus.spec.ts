import {
  decideRunStatus,
  type ClassifiableFailure,
} from './task-check-evaluation';

const fail = (
  over: Partial<ClassifiableFailure> = {},
): ClassifiableFailure => ({
  connectionId: 'c',
  checkId: 'k',
  resourceId: 'r',
  ...over,
});

describe('decideRunStatus', () => {
  // Static / AWS / GCP / Azure — isDynamic=false → NEVER held; identical to the
  // historical mapping (error → failed, else raw status).
  describe('non-dynamic (never held)', () => {
    it('success → success', () => {
      expect(
        decideRunStatus({
          resultStatus: 'success',
          failures: [],
          isDynamic: false,
        }),
      ).toBe('success');
    });
    it('failed (even an our-side-looking 404) → failed', () => {
      expect(
        decideRunStatus({
          resultStatus: 'failed',
          failures: [fail({ httpStatus: 404 })],
          isDynamic: false,
        }),
      ).toBe('failed');
    });
    it('execution error → failed', () => {
      expect(
        decideRunStatus({
          resultStatus: 'error',
          failures: [fail({ threw: true })],
          isDynamic: false,
        }),
      ).toBe('failed');
    });
  });

  // Dynamic — our-side/transient held as inconclusive; real failures shown.
  describe('dynamic', () => {
    it('success → success', () => {
      expect(
        decideRunStatus({
          resultStatus: 'success',
          failures: [],
          isDynamic: true,
        }),
      ).toBe('success');
    });
    it('execution error → inconclusive (held)', () => {
      expect(
        decideRunStatus({
          resultStatus: 'error',
          failures: [],
          isDynamic: true,
        }),
      ).toBe('inconclusive');
    });
    it('all failures our-side (404) → inconclusive (held)', () => {
      expect(
        decideRunStatus({
          resultStatus: 'failed',
          failures: [fail({ httpStatus: 404 })],
          isDynamic: true,
        }),
      ).toBe('inconclusive');
    });
    it('genuine compliance finding (no error signal) → failed (shown)', () => {
      expect(
        decideRunStatus({
          resultStatus: 'failed',
          failures: [fail()],
          isDynamic: true,
        }),
      ).toBe('failed');
    });
    it('customer-side (401) → failed (shown — action needed)', () => {
      expect(
        decideRunStatus({
          resultStatus: 'failed',
          failures: [fail({ httpStatus: 401 })],
          isDynamic: true,
        }),
      ).toBe('failed');
    });
    it('mixed held + real → failed (any effective failure surfaces)', () => {
      expect(
        decideRunStatus({
          resultStatus: 'failed',
          failures: [fail({ httpStatus: 404 }), fail({ resourceId: 'r2' })],
          isDynamic: true,
        }),
      ).toBe('failed');
    });
  });
});
