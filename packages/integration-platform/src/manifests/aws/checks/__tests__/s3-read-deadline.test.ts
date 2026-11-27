import { afterEach, describe, expect, it, jest } from 'bun:test';
import { withS3ReadDeadline } from '../s3-read-deadline';

afterEach(() => jest.useRealTimers());

describe('withS3ReadDeadline', () => {
  it('returns the original result and clears its timer', async () => {
    jest.useFakeTimers();
    const expected = { configured: true };
    const actual = await withS3ReadDeadline({ read: async () => expected });
    expect(actual).toBe(expected);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('preserves the original SDK failure and clears its timer', async () => {
    jest.useFakeTimers();
    const expected = new Error('original SDK failure');
    const result = withS3ReadDeadline({
      read: async () => {
        throw expected;
      },
    });
    await expect(result).rejects.toBe(expected);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('clears the timer when the read throws synchronously', async () => {
    jest.useFakeTimers();
    const expected = new Error('original synchronous failure');
    const result = withS3ReadDeadline({
      read: () => {
        throw expected;
      },
    });
    await expect(result).rejects.toBe(expected);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('aborts a read that never settles even when the transport ignores cancellation', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    const result = withS3ReadDeadline({
      read: (abortSignal) => {
        signal = abortSignal;
        return new Promise<never>(() => {});
      },
    });
    const rejection = result.catch((error: unknown) => error);
    jest.advanceTimersByTime(30_000);
    expect(await rejection).toMatchObject({ name: 'TimeoutError' });
    expect(signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('uses the remaining shared budget instead of starting a fresh full timeout', async () => {
    jest.useFakeTimers();
    const result = withS3ReadDeadline({
      deadlineAt: Date.now() + 7,
      read: () => new Promise<never>(() => {}),
    });
    const rejection = result.catch((error: unknown) => error);
    jest.advanceTimersByTime(7);
    expect(await rejection).toMatchObject({ name: 'TimeoutError' });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not issue a request or create a timer after the shared budget expires', async () => {
    jest.useFakeTimers();
    let calls = 0;
    const result = withS3ReadDeadline({
      deadlineAt: Date.now(),
      read: async () => {
        calls++;
      },
    });
    await expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(calls).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not later abort a request which already completed', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    await withS3ReadDeadline({
      read: async (abortSignal) => {
        signal = abortSignal;
      },
    });
    jest.advanceTimersByTime(60_000);
    expect(signal?.aborted).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });
});
