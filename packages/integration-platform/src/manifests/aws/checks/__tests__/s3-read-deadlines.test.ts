import {
  GetBucketEncryptionCommand,
  GetPublicAccessBlockCommand,
  ListBucketsCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it, jest } from 'bun:test';
import { gatherBuckets, type S3BucketInfo } from '../s3-buckets';

interface SendOptions {
  abortSignal?: AbortSignal;
}

const makeClient = (
  send: (command: unknown, options?: SendOptions) => Promise<unknown>,
): S3Client => ({ send }) as unknown as S3Client;

const never = (): Promise<never> => new Promise(() => {});

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 100; index++) await Promise.resolve();
}

function observe(result: Promise<S3BucketInfo[]>) {
  const state: {
    done: boolean;
    buckets?: S3BucketInfo[];
    error?: unknown;
  } = { done: false };
  void result.then(
    (buckets) => Object.assign(state, { done: true, buckets }),
    (error: unknown) => Object.assign(state, { done: true, error }),
  );
  return state;
}

afterEach(() => jest.useRealTimers());

describe('S3 metadata read deadlines', () => {
  it('aborts a stalled encryption read and retains fast, denied and missing-config results in order', async () => {
    jest.useFakeTimers();
    let slowSignal: AbortSignal | undefined;
    const client = makeClient(async (command, options) => {
      if (command instanceof ListBucketsCommand) {
        return { Buckets: ['slow', 'fast', 'denied', 'missing'].map((Name) => ({ Name })) };
      }
      if (!(command instanceof GetBucketEncryptionCommand)) throw new Error('unexpected command');
      if (command.input.Bucket === 'slow') {
        slowSignal = options?.abortSignal;
        return never();
      }
      if (command.input.Bucket === 'denied') {
        throw Object.assign(new Error('not authorized'), { name: 'AccessDenied' });
      }
      if (command.input.Bucket === 'missing') {
        throw Object.assign(new Error('not configured'), {
          name: 'ServerSideEncryptionConfigurationNotFoundError',
        });
      }
      return { ServerSideEncryptionConfiguration: { Rules: [{}] } };
    });
    const state = observe(gatherBuckets(client, { encryption: true, publicAccess: false }));
    await flushPromises();
    jest.advanceTimersByTime(30_000);
    await flushPromises();

    expect(state.done).toBe(true);
    expect(state.error).toBeUndefined();
    expect(slowSignal?.aborted).toBe(true);
    expect(state.buckets?.map((bucket) => bucket.name)).toEqual([
      'slow',
      'fast',
      'denied',
      'missing',
    ]);
    expect(state.buckets?.[0]).toMatchObject({ encryptionDetermined: false });
    expect(state.buckets?.[0]?.encryptionReadFailure?.error).toContain('TimeoutError');
    expect(state.buckets?.[1]).toMatchObject({ encryptionDetermined: true, encrypted: true });
    expect(state.buckets?.[2]?.encryptionReadFailure).toMatchObject({ denied: true });
    expect(state.buckets?.[3]).toMatchObject({ encryptionDetermined: true, encrypted: false });
  });

  it('bounds a stalled public-access read without turning it into a missing configuration', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    const client = makeClient(async (command, options) => {
      if (command instanceof ListBucketsCommand) return { Buckets: [{ Name: 'slow' }] };
      if (!(command instanceof GetPublicAccessBlockCommand)) throw new Error('unexpected command');
      signal = options?.abortSignal;
      return never();
    });
    const state = observe(gatherBuckets(client, { encryption: false, publicAccess: true }));
    await flushPromises();
    jest.advanceTimersByTime(30_000);
    await flushPromises();

    expect(state.done).toBe(true);
    expect(signal?.aborted).toBe(true);
    expect(state.buckets?.[0]).toMatchObject({ publicAccessDetermined: false, bucketBpa: null });
    expect(state.buckets?.[0]?.publicAccessReadFailure?.error).toContain('TimeoutError');
  });

  it('retains every listed bucket when the shared posture-read budget expires', async () => {
    jest.useFakeTimers();
    const names = Array.from({ length: 85 }, (_, index) => `bucket-${index}`);
    const signals: AbortSignal[] = [];
    let reads = 0;
    const client = makeClient(async (command, options) => {
      if (command instanceof ListBucketsCommand)
        return { Buckets: names.map((Name) => ({ Name })) };
      reads++;
      if (options?.abortSignal) signals.push(options.abortSignal);
      return never();
    });
    const state = observe(gatherBuckets(client, { encryption: true, publicAccess: true }));
    await flushPromises();
    for (let index = 0; index < 4; index++) {
      jest.advanceTimersByTime(30_000);
      await flushPromises();
    }

    expect(state.done).toBe(true);
    expect(state.buckets?.map((bucket) => bucket.name)).toEqual(names);
    expect(
      state.buckets?.every(
        (bucket) => !bucket.encryptionDetermined && !bucket.publicAccessDetermined,
      ),
    ).toBe(true);
    expect(reads).toBe(80);
    expect(signals).toHaveLength(reads);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('bounds both paginated and legacy inventory requests before reporting an account-level read failure', async () => {
    jest.useFakeTimers();
    const signals: AbortSignal[] = [];
    let lists = 0;
    const client = makeClient(async (command, options) => {
      if (!(command instanceof ListBucketsCommand)) throw new Error('unexpected metadata read');
      lists++;
      if (options?.abortSignal) signals.push(options.abortSignal);
      return never();
    });
    const state = observe(gatherBuckets(client, { encryption: true, publicAccess: false }));
    await flushPromises();
    for (let index = 0; index < 2; index++) {
      jest.advanceTimersByTime(30_000);
      await flushPromises();
    }

    expect(state.done).toBe(true);
    expect(state.error).toBeInstanceOf(Error);
    expect(state.buckets).toBeUndefined();
    expect(lists).toBe(2);
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('uses a successful legacy fallback after the paginated request times out', async () => {
    jest.useFakeTimers();
    let legacyCalls = 0;
    const client = makeClient(async (command) => {
      if (command instanceof ListBucketsCommand) {
        if (command.input.MaxBuckets) return never();
        legacyCalls++;
        return { Buckets: [{ Name: 'legacy' }] };
      }
      return { ServerSideEncryptionConfiguration: { Rules: [{}] } };
    });
    const state = observe(gatherBuckets(client, { encryption: true, publicAccess: false }));
    await flushPromises();
    jest.advanceTimersByTime(30_000);
    await flushPromises();

    expect(state.done).toBe(true);
    expect(legacyCalls).toBe(1);
    expect(state.buckets?.[0]).toMatchObject({
      name: 'legacy',
      encrypted: true,
      encryptionDetermined: true,
    });
  });
});
