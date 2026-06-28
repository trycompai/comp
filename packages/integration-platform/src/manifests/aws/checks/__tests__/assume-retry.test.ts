import { describe, expect, it } from 'bun:test';
import { isRetryableAssumeError, retryAssume } from '../assume-retry';

// Fast, deterministic options for tests — never actually sleep.
const fastOpts = {
  sleep: async () => {},
  random: () => 0,
  baseDelayMs: 1,
  maxDelayMs: 1,
};

function awsError(name: string, extra: Record<string, unknown> = {}): Error {
  return Object.assign(new Error(`${name} occurred`), { name, ...extra });
}

describe('isRetryableAssumeError', () => {
  it('retries IAM/STS eventual-consistency AccessDenied (the customer bug)', () => {
    expect(isRetryableAssumeError(awsError('AccessDenied'))).toBe(true);
    expect(isRetryableAssumeError(awsError('AccessDeniedException'))).toBe(true);
  });

  it('retries expired-token, throttling, 5xx and network errors', () => {
    expect(isRetryableAssumeError(awsError('ExpiredToken'))).toBe(true);
    expect(isRetryableAssumeError(awsError('ThrottlingException'))).toBe(true);
    expect(
      isRetryableAssumeError({ name: 'X', $metadata: { httpStatusCode: 503 } }),
    ).toBe(true);
    expect(isRetryableAssumeError(new Error('socket hang up'))).toBe(true);
  });

  it('does NOT retry hard configuration errors', () => {
    expect(isRetryableAssumeError(awsError('ValidationError'))).toBe(false);
    expect(
      isRetryableAssumeError(new Error('Invalid IAM Role ARN format')),
    ).toBe(false);
    expect(isRetryableAssumeError(null)).toBe(false);
    expect(isRetryableAssumeError(undefined)).toBe(false);
  });
});

describe('retryAssume', () => {
  it('retries a transient AccessDenied then succeeds (no AWS change needed)', async () => {
    let calls = 0;
    const result = await retryAssume(async () => {
      calls++;
      if (calls < 3) throw awsError('AccessDenied');
      return 'creds';
    }, fastOpts);
    expect(result).toBe('creds');
    expect(calls).toBe(3);
  });

  it('does not retry a non-transient error (single attempt)', async () => {
    let calls = 0;
    await expect(
      retryAssume(async () => {
        calls++;
        throw awsError('ValidationError');
      }, fastOpts),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('gives up after the configured attempts on a persistent transient error', async () => {
    let calls = 0;
    await expect(
      retryAssume(
        async () => {
          calls++;
          throw awsError('AccessDenied');
        },
        { ...fastOpts, attempts: 4 },
      ),
    ).rejects.toThrow();
    expect(calls).toBe(4);
  });

  it('succeeds on the first attempt without sleeping', async () => {
    let slept = false;
    const result = await retryAssume(async () => 'ok', {
      ...fastOpts,
      sleep: async () => {
        slept = true;
      },
    });
    expect(result).toBe('ok');
    expect(slept).toBe(false);
  });
});
