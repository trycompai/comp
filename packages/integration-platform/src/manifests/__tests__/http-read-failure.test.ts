import { describe, expect, it } from 'bun:test';
import { toHttpReadFailure } from '../http-read-failure';

const httpError = (status: number, message: string) => {
  const err = new Error(message);
  (err as Error & { status: number }).status = status;
  return err;
};

describe('toHttpReadFailure — ctx.fetch error classification', () => {
  it('classifies 403 and 401 as denied', () => {
    expect(toHttpReadFailure(httpError(403, 'HTTP 403: Forbidden')).denied).toBe(true);
    expect(toHttpReadFailure(httpError(401, 'HTTP 401: Unauthorized')).denied).toBe(true);
  });

  it('classifies provider permission phrases as denied even without a status', () => {
    expect(toHttpReadFailure(new Error('PERMISSION_DENIED: missing role')).denied).toBe(true);
    expect(toHttpReadFailure(new Error('AuthorizationFailed: no access')).denied).toBe(true);
  });

  it('treats 5xx/429/network errors as transient (not denied)', () => {
    expect(toHttpReadFailure(httpError(500, 'HTTP 500: Internal Server Error')).denied).toBe(false);
    expect(toHttpReadFailure(httpError(429, 'HTTP 429: Too Many Requests')).denied).toBe(false);
    expect(toHttpReadFailure(new Error('socket hang up')).denied).toBe(false);
  });

  it('preserves the error message and never sets regionDisabled', () => {
    const f = toHttpReadFailure(httpError(503, 'HTTP 503: Service Unavailable - upstream'));
    expect(f.error).toBe('HTTP 503: Service Unavailable - upstream');
    expect(f.regionDisabled).toBe(false);
  });

  it('stringifies non-Error throwables', () => {
    expect(toHttpReadFailure('boom')).toMatchObject({ error: 'boom', denied: false });
  });
});
