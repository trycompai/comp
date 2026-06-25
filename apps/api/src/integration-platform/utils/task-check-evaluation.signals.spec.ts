import { failureSignalsFromEvidence } from './task-check-evaluation';

describe('failureSignalsFromEvidence', () => {
  it('parses http status from evidence.error like "http_404"', () => {
    const s = failureSignalsFromEvidence({ error: 'http_404', message: 'not found' });
    expect(s.httpStatus).toBe(404);
    expect(s.errorText).toContain('not found');
    expect(s.threw).toBe(false);
  });

  it('falls back to numeric evidence.status', () => {
    expect(failureSignalsFromEvidence({ status: 503 }).httpStatus).toBe(503);
  });

  it('marks threw when the result status is "error"', () => {
    expect(failureSignalsFromEvidence({}, 'error').threw).toBe(true);
  });

  it('prefers message over error for errorText and redacts it', () => {
    const s = failureSignalsFromEvidence({
      error: 'http_401',
      message: 'auth failed for Bearer sk-supersecrettokenvalue123456',
    });
    expect(s.errorText).not.toContain('sk-supersecrettokenvalue123456');
    expect(s.errorText).toContain('auth failed');
  });

  it('returns empty signals for an evidence-less finding (treated as compliance)', () => {
    const s = failureSignalsFromEvidence(undefined);
    expect(s.httpStatus).toBeNull();
    expect(s.errorText).toBeNull();
    expect(s.threw).toBe(false);
  });
});
