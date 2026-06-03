import {
  GetBucketEncryptionCommand,
  GetPublicAccessBlockCommand,
  ListBucketsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  GetPublicAccessBlockCommand as GetAccountPublicAccessBlockCommand,
  S3ControlClient,
} from '@aws-sdk/client-s3-control';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { resolveAwsSessionOrFail, type CheckOutcome, emitOutcomes } from './shared';

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
}

const FLAG_KEYS: Array<keyof BpaFlags> = [
  'blockPublicAcls',
  'ignorePublicAcls',
  'blockPublicPolicy',
  'restrictPublicBuckets',
];

/** A bucket is protected if the union of account-level + bucket-level BPA has all four flags on. */
function isFullyBlocked(bucket: BpaFlags | null, account: BpaFlags | null): boolean {
  return FLAG_KEYS.every((k) => Boolean(bucket?.[k]) || Boolean(account?.[k]));
}

export function evaluateS3Encryption(buckets: S3BucketInfo[]): CheckOutcome[] {
  return buckets.map((b): CheckOutcome => {
    if (!b.encryptionDetermined) {
      // Read failed → unverified. Don't assert a false "no encryption" (high),
      // but don't silently drop it either (that would let an all-unreadable
      // account pass with no findings).
      return {
        kind: 'fail',
        title: `Could not verify encryption: ${b.name}`,
        description: `Encryption status for bucket "${b.name}" could not be read, so it is unverified.`,
        resourceType: 'aws-s3-bucket',
        resourceId: b.name,
        severity: 'medium',
        remediation:
          'Grant s3:GetEncryptionConfiguration to the integration role so default encryption can be verified, then re-run.',
        evidence: { bucket: b.name, encryptionDetermined: false },
      };
    }
    return b.encrypted
      ? {
          kind: 'pass',
          title: `Default encryption enabled: ${b.name}`,
          description: `Bucket "${b.name}" has default encryption enabled.`,
          resourceType: 'aws-s3-bucket',
          resourceId: b.name,
          evidence: { bucket: b.name, encrypted: true },
        }
      : {
          kind: 'fail',
          title: `No default encryption: ${b.name}`,
          description: `Bucket "${b.name}" does not have default server-side encryption enabled.`,
          resourceType: 'aws-s3-bucket',
          resourceId: b.name,
          severity: 'high',
          remediation: 'Enable default encryption (SSE-S3 or SSE-KMS) on the bucket.',
          evidence: { bucket: b.name, encrypted: false },
        };
  });
}

export function evaluateS3PublicAccess(
  buckets: S3BucketInfo[],
  accountBpa: BpaFlags | null,
): CheckOutcome[] {
  return buckets.map((b): CheckOutcome => {
    if (!b.publicAccessDetermined) {
      return {
        kind: 'fail',
        title: `Could not verify public access: ${b.name}`,
        description: `Block Public Access status for bucket "${b.name}" could not be read, so its public-access posture is unverified.`,
        resourceType: 'aws-s3-bucket',
        resourceId: b.name,
        severity: 'medium',
        remediation:
          'Grant s3:GetBucketPublicAccessBlock to the integration role so public-access settings can be verified, then re-run.',
        evidence: { bucket: b.name, publicAccessDetermined: false },
      };
    }
    return isFullyBlocked(b.bucketBpa, accountBpa)
      ? {
          kind: 'pass',
          title: `Public access blocked: ${b.name}`,
          description: `Bucket "${b.name}" has S3 Block Public Access fully enabled (account and/or bucket level).`,
          resourceType: 'aws-s3-bucket',
          resourceId: b.name,
          evidence: { bucket: b.name, bucketBpa: b.bucketBpa, accountBpa },
        }
      : {
          kind: 'fail',
          title: `Public access not fully blocked: ${b.name}`,
          description: `Bucket "${b.name}" does not have all four S3 Block Public Access settings enabled at the account or bucket level.`,
          resourceType: 'aws-s3-bucket',
          resourceId: b.name,
          severity: 'high',
          remediation: 'Enable all four S3 Block Public Access settings on the bucket (or account).',
          evidence: { bucket: b.name, bucketBpa: b.bucketBpa, accountBpa },
        };
  });
}

async function gatherBuckets(
  s3: S3Client,
  opts: { encryption: boolean; publicAccess: boolean },
): Promise<S3BucketInfo[]> {
  const list = await s3.send(new ListBucketsCommand({}));
  const names = (list.Buckets ?? [])
    .map((b) => b.Name)
    .filter((n): n is string => typeof n === 'string');

  const infos: S3BucketInfo[] = [];
  for (const name of names) {
    let encrypted = false;
    let encryptionDetermined = true;
    let bucketBpa: BpaFlags | null = null;
    let publicAccessDetermined = true;

    if (opts.encryption) {
      try {
        const enc = await s3.send(new GetBucketEncryptionCommand({ Bucket: name }));
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
        }
      }
    }
    if (opts.publicAccess) {
      try {
        const pab = await s3.send(new GetPublicAccessBlockCommand({ Bucket: name }));
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
        }
      }
    }
    infos.push({ name, encrypted, encryptionDetermined, bucketBpa, publicAccessDetermined });
  }
  return infos;
}

/** Account ID from the connection's role ARN (arn:aws:iam::ACCOUNT:role/...). */
function accountIdFromCtx(ctx: CheckContext): string | null {
  const arn = (ctx.credentials as Record<string, unknown>).roleArn;
  if (typeof arn !== 'string') return null;
  const parts = arn.split(':');
  return parts.length >= 5 && parts[4] ? parts[4] : null;
}

export const s3EncryptionCheck: IntegrationCheck = {
  id: 'aws-s3-encryption',
  name: 'S3 — default encryption enabled',
  description: 'Verify all S3 buckets have default server-side encryption enabled.',
  service: 's3',
  taskMapping: TASK_TEMPLATES.encryptionAtRest,
  run: async (ctx: CheckContext) => {
    const session = await resolveAwsSessionOrFail(ctx);
    if (!session) {
      ctx.log('AWS S3 encryption check: connection not configured — skipping');
      return;
    }
    const s3 = new S3Client({
      region: session.regions[0],
      credentials: session.credentials,
      followRegionRedirects: true,
    });
    let buckets: S3BucketInfo[];
    try {
      buckets = await gatherBuckets(s3, { encryption: true, publicAccess: false });
    } catch (err) {
      ctx.fail({
        title: 'Could not verify S3 encryption',
        description:
          'S3 buckets could not be listed, so default encryption could not be verified.',
        resourceType: 'aws-account',
        resourceId: 'account',
        severity: 'medium',
        remediation:
          'Grant s3:ListAllMyBuckets (and s3:GetEncryptionConfiguration) to the integration role, then re-run the check.',
        evidence: { error: err instanceof Error ? err.message : String(err) },
      });
      return;
    }
    if (buckets.length === 0) return;
    emitOutcomes(ctx, evaluateS3Encryption(buckets));
  },
};

export const s3PublicAccessCheck: IntegrationCheck = {
  id: 'aws-s3-public-access',
  name: 'S3 — public access blocked',
  description: 'Verify all S3 buckets have S3 Block Public Access fully enabled (account or bucket level).',
  service: 's3',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,
  run: async (ctx: CheckContext) => {
    const session = await resolveAwsSessionOrFail(ctx);
    if (!session) {
      ctx.log('AWS S3 public-access check: connection not configured — skipping');
      return;
    }
    const s3 = new S3Client({
      region: session.regions[0],
      credentials: session.credentials,
      followRegionRedirects: true,
    });

    // Account-level Block Public Access applies to every bucket. Read it once;
    // if denied/absent, fall back to bucket-level only (graceful).
    let accountBpa: BpaFlags | null = null;
    const accountId = accountIdFromCtx(ctx);
    if (accountId) {
      try {
        const s3control = new S3ControlClient({
          region: session.regions[0],
          credentials: session.credentials,
        });
        const resp = await s3control.send(
          new GetAccountPublicAccessBlockCommand({ AccountId: accountId }),
        );
        const c = resp.PublicAccessBlockConfiguration;
        accountBpa = {
          blockPublicAcls: Boolean(c?.BlockPublicAcls),
          ignorePublicAcls: Boolean(c?.IgnorePublicAcls),
          blockPublicPolicy: Boolean(c?.BlockPublicPolicy),
          restrictPublicBuckets: Boolean(c?.RestrictPublicBuckets),
        };
      } catch (err) {
        ctx.log(
          `AWS S3: account-level Block Public Access unavailable (${err instanceof Error ? err.message : String(err)}); using bucket-level only`,
        );
      }
    }

    let buckets: S3BucketInfo[];
    try {
      buckets = await gatherBuckets(s3, { encryption: false, publicAccess: true });
    } catch (err) {
      ctx.fail({
        title: 'Could not verify S3 public access',
        description:
          'S3 buckets could not be listed, so Block Public Access could not be verified.',
        resourceType: 'aws-account',
        resourceId: 'account',
        severity: 'medium',
        remediation:
          'Grant s3:ListAllMyBuckets (and s3:GetBucketPublicAccessBlock) to the integration role, then re-run the check.',
        evidence: { error: err instanceof Error ? err.message : String(err) },
      });
      return;
    }
    if (buckets.length === 0) return;
    emitOutcomes(ctx, evaluateS3PublicAccess(buckets, accountBpa));
  },
};