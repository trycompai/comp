import { failureSignalsFromEvidence } from './task-check-evaluation';

describe('failureSignalsFromEvidence', () => {
  it('parses http status from evidence.error like "http_404"', () => {
    const s = failureSignalsFromEvidence({
      error: 'http_404',
      message: 'not found',
    });
    expect(s.httpStatus).toBe(404);
    expect(s.errorText).toContain('not found');
    expect(s.threw).toBe(false);
  });

  it('falls back to numeric evidence.status', () => {
    expect(failureSignalsFromEvidence({ status: 503 }).httpStatus).toBe(503);
  });

  it('parses spaced/colon HTTP forms so 401/403 are not missed', () => {
    // These would otherwise default to our_side (held) instead of customer_side.
    expect(
      failureSignalsFromEvidence({ message: 'HTTP 401 Unauthorized' })
        .httpStatus,
    ).toBe(401);
    expect(
      failureSignalsFromEvidence({ error: 'HTTP: 403 Forbidden' }).httpStatus,
    ).toBe(403);
    expect(
      failureSignalsFromEvidence({ message: 'HTTP-429 rate limited' })
        .httpStatus,
    ).toBe(429);
    // A URL must NOT be mistaken for a status.
    expect(
      failureSignalsFromEvidence({
        message: 'fetch https://x.com/v404/p failed',
      }).httpStatus,
    ).toBeNull();
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
