import {
  GetBucketEncryptionCommand,
  GetPublicAccessBlockCommand,
  ListBucketsCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { describe, expect, it } from 'bun:test';
import { gatherBuckets } from '../s3-buckets';

interface BpaResponse {
  PublicAccessBlockConfiguration?: {
    BlockPublicAcls?: boolean;
    IgnorePublicAcls?: boolean;
    BlockPublicPolicy?: boolean;
    RestrictPublicBuckets?: boolean;
  };
}

const FULLY_BLOCKED: BpaResponse = {
  PublicAccessBlockConfiguration: {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true,
  },
};

const namedError = (name: string, message: string): Error => {
  const err = new Error(message);
  err.name = name;
  return err;
};

/** Fake S3Client whose `send` dispatches on the command type. */
function fakeClient(opts: {
  buckets: Array<{ name: string; region?: string }>;
  onPublicAccess?: (bucket: string) => BpaResponse | Promise<BpaResponse>;
}): S3Client {
  const send = async (command: unknown): Promise<unknown> => {
    if (command instanceof ListBucketsCommand) {
      return {
        Buckets: opts.buckets.map((b) => ({
          Name: b.name,
          BucketRegion: b.region,
        })),
        ContinuationToken: undefined,
      };
    }
    if (command instanceof GetPublicAccessBlockCommand) {
      const bucket = String(command.input.Bucket);
      return opts.onPublicAccess ? await opts.onPublicAccess(bucket) : FULLY_BLOCKED;
    }
    if (command instanceof GetBucketEncryptionCommand) {
      return { ServerSideEncryptionConfiguration: { Rules: [{}] } };
    }
    throw new Error('unexpected command');
  };
  return { send } as unknown as S3Client;
}

describe('gatherBuckets', () => {
  it('reads every bucket and preserves input order', async () => {
    const client = fakeClient({
      buckets: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
    });
    const infos = await gatherBuckets(client, {
      encryption: false,
      publicAccess: true,
    });
    expect(infos.map((i) => i.name)).toEqual(['a', 'b', 'c']);
    for (const info of infos) {
      expect(info.publicAccessDetermined).toBe(true);
      expect(info.bucketBpa).not.toBeNull();
    }
  });

  it('isolates a per-bucket read failure (one bad bucket cannot fail the run)', async () => {
    const client = fakeClient({
      buckets: [{ name: 'ok' }, { name: 'denied' }, { name: 'ok2' }],
      onPublicAccess: (bucket) => {
        if (bucket === 'denied') {
          throw namedError('AccessDenied', 'not authorized to perform');
        }
        return FULLY_BLOCKED;
      },
    });
    const infos = await gatherBuckets(client, {
      encryption: false,
      publicAccess: true,
    });

    const denied = infos.find((i) => i.name === 'denied');
    expect(denied?.publicAccessDetermined).toBe(false);
    expect(denied?.publicAccessReadFailure).toBeDefined();

    for (const name of ['ok', 'ok2']) {
      const info = infos.find((i) => i.name === name);
      expect(info?.publicAccessDetermined).toBe(true);
      expect(info?.bucketBpa).not.toBeNull();
    }
  });

  it('treats NoSuchPublicAccessBlockConfiguration as no bucket-level config (a genuine finding, not an error)', async () => {
    const client = fakeClient({
      buckets: [{ name: 'nocfg' }],
      onPublicAccess: () => {
        throw namedError('NoSuchPublicAccessBlockConfiguration', 'none');
      },
    });
    const infos = await gatherBuckets(client, {
      encryption: false,
      publicAccess: true,
    });
    expect(infos[0].publicAccessDetermined).toBe(true);
    expect(infos[0].bucketBpa).toBeNull();
  });

  it('routes a regioned bucket to its per-region client and keeps order', async () => {
    const regionalServed: string[] = [];
    const baseServed: string[] = [];
    const regional = fakeClient({
      buckets: [],
      onPublicAccess: (b) => {
        regionalServed.push(b);
        return FULLY_BLOCKED;
      },
    });
    const base = fakeClient({
      buckets: [{ name: 'a' }, { name: 'b', region: 'eu-west-1' }, { name: 'c' }],
      onPublicAccess: (b) => {
        baseServed.push(b);
        return FULLY_BLOCKED;
      },
    });

    const infos = await gatherBuckets(base, {
      encryption: false,
      publicAccess: true,
      clientForRegion: () => regional,
    });

    expect(infos.map((i) => i.name)).toEqual(['a', 'b', 'c']);
    expect(regionalServed).toContain('b');
    expect(baseServed).toContain('a');
    expect(baseServed).toContain('c');
    expect(baseServed).not.toContain('b');
  });

  it('reads buckets concurrently but bounded (regression guard: serial reads time out the gateway)', async () => {
    const buckets = Array.from({ length: 50 }, (_, i) => ({ name: `b${i}` }));
    let inFlight = 0;
    let maxInFlight = 0;
    const client = fakeClient({
      buckets,
      onPublicAccess: async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight--;
        return FULLY_BLOCKED;
      },
    });

    const infos = await gatherBuckets(client, {
      encryption: false,
      publicAccess: true,
    });

    expect(infos).toHaveLength(50);
    // Serial execution would never exceed 1 in flight — this is the regression.
    expect(maxInFlight).toBeGreaterThan(1);
    // ...but it must stay bounded (BUCKET_READ_CONCURRENCY = 20).
    expect(maxInFlight).toBeLessThanOrEqual(20);
  });
});
