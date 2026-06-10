import {
  GetBucketEncryptionCommand,
  GetPublicAccessBlockCommand,
  ListBucketsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { toReadFailure, type AwsSession, type ReadFailure } from './shared';

export interface BpaFlags {
  blockPublicAcls: boolean;
  ignorePublicAcls: boolean;
  blockPublicPolicy: boolean;
  restrictPublicBuckets: boolean;
}

export interface S3BucketInfo {
  name: string;
  encrypted: boolean;
  /** false when encryption status couldn't be read (error) → excluded from eval */
  encryptionDetermined: boolean;
  /** bucket-level Block Public Access flags, or null when none configured */
  bucketBpa: BpaFlags | null;
  /** false when bucket-level Block Public Access couldn't be read (error) → excluded from eval */
  publicAccessDetermined: boolean;
  /** set when the encryption read failed — the real error, surfaced in evidence */
  encryptionReadFailure?: ReadFailure;
  /** set when the Block Public Access read failed — the real error, surfaced in evidence */
  publicAccessReadFailure?: ReadFailure;
}

/**
 * One S3 client per region, created lazily. Per-bucket reads must go to the
 * bucket's own regional endpoint: cross-region calls depend on S3 301
 * redirects whose x-amz-bucket-region header is not guaranteed — observed in
 * prod failing exactly the buckets outside the connection's region.
 */
export function regionalS3Clients(session: AwsSession): {
  s3: S3Client;
  clientForRegion: (region: string) => S3Client;
} {
  const clients = new Map<string, S3Client>();
  const clientForRegion = (region: string) => {
    let client = clients.get(region);
    if (!client) {
      client = new S3Client({
        region,
        credentials: session.credentials,
        followRegionRedirects: true,
        // Reads are idempotent; extra attempts ride out transient network or
        // throttling failures during the scheduled-run herd.
        maxAttempts: 5,
      });
      clients.set(region, client);
    }
    return client;
  };
  // regions is guaranteed non-empty by resolveAwsCredentialInputs
  return { s3: clientForRegion(session.regions[0]), clientForRegion };
}

/**
 * List every bucket with its region. MaxBuckets opts into the paginated
 * ListBuckets API — the only form that populates BucketRegion. Falls back to
 * the legacy unpaginated form (no regions) if the partition rejects it, so a
 * genuine ListBuckets failure still surfaces as the account-level finding.
 */
export async function listAllBuckets(
  s3: S3Client,
  log?: (message: string) => void,
): Promise<Array<{ name: string; region?: string }>> {
  try {
    const out: Array<{ name: string; region?: string }> = [];
    let token: string | undefined;
    do {
      const page = await s3.send(
        new ListBucketsCommand({ MaxBuckets: 1000, ContinuationToken: token }),
      );
      for (const b of page.Buckets ?? []) {
        if (typeof b.Name === 'string') {
          out.push({ name: b.Name, region: b.BucketRegion });
        }
      }
      token = page.ContinuationToken;
    } while (token);
    return out;
  } catch (err) {
    log?.(
      `S3: paginated ListBuckets failed (${toReadFailure(err).error}); falling back to legacy form — bucket regions unknown, cross-region reads depend on S3 redirects`,
    );
    const list = await s3.send(new ListBucketsCommand({}));
    return (list.Buckets ?? [])
      .map((b) => b.Name)
      .filter((n): n is string => typeof n === 'string')
      .map((name) => ({ name }));
  }
}

export async function gatherBuckets(
  s3: S3Client,
  opts: {
    encryption: boolean;
    publicAccess: boolean;
    log?: (message: string) => void;
    /** regional client for buckets outside the default region */
    clientForRegion?: (region: string) => S3Client;
  },
): Promise<S3BucketInfo[]> {
  const buckets = await listAllBuckets(s3, opts.log);

  const infos: S3BucketInfo[] = [];
  for (const { name, region } of buckets) {
    const client =
      region && opts.clientForRegion ? opts.clientForRegion(region) : s3;
    let encrypted = false;
    let encryptionDetermined = true;
    let encryptionReadFailure: ReadFailure | undefined;
    let bucketBpa: BpaFlags | null = null;
    let publicAccessDetermined = true;
    let publicAccessReadFailure: ReadFailure | undefined;

    if (opts.encryption) {
      try {
        const enc = await client.send(new GetBucketEncryptionCommand({ Bucket: name }));
        encrypted = (enc.ServerSideEncryptionConfiguration?.Rules?.length ?? 0) > 0;
      } catch (err) {
        // "no encryption configured" is a genuine finding; any other error
        // (permissions/transient) is indeterminate → exclude from evaluation.
        if (
          err instanceof Error &&
          /ServerSideEncryptionConfigurationNotFound/i.test(err.name)
        ) {
          encrypted = false;
        } else {
          encryptionDetermined = false;
          encryptionReadFailure = toReadFailure(err);
          opts.log?.(
            `S3 ${name}: encryption read failed — ${encryptionReadFailure.error}`,
          );
        }
      }
    }
    if (opts.publicAccess) {
      try {
        const pab = await client.send(new GetPublicAccessBlockCommand({ Bucket: name }));
        const c = pab.PublicAccessBlockConfiguration;
        bucketBpa = {
          blockPublicAcls: Boolean(c?.BlockPublicAcls),
          ignorePublicAcls: Boolean(c?.IgnorePublicAcls),
          blockPublicPolicy: Boolean(c?.BlockPublicPolicy),
          restrictPublicBuckets: Boolean(c?.RestrictPublicBuckets),
        };
      } catch (err) {
        // "no bucket-level config" is a genuine finding (account-level may still
        // cover it); any other error (AccessDenied/transient) is indeterminate →
        // exclude from evaluation so we don't report a false public-access failure.
        if (
          err instanceof Error &&
          /NoSuchPublicAccessBlockConfiguration/i.test(err.name)
        ) {
          bucketBpa = null; // no bucket-level config
        } else {
          publicAccessDetermined = false;
          publicAccessReadFailure = toReadFailure(err);
          opts.log?.(
            `S3 ${name}: Block Public Access read failed — ${publicAccessReadFailure.error}`,
          );
        }
      }
    }
    infos.push({
      name,
      encrypted,
      encryptionDetermined,
      encryptionReadFailure,
      bucketBpa,
      publicAccessDetermined,
      publicAccessReadFailure,
    });
  }
  return infos;
}
