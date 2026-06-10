import {
  GetPublicAccessBlockCommand as GetAccountPublicAccessBlockCommand,
  S3ControlClient,
} from '@aws-sdk/client-s3-control';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  gatherBuckets,
  regionalS3Clients,
  type BpaFlags,
  type S3BucketInfo,
} from './s3-buckets';
import {
  awsAccountIdFromCtx,
  remediationForReadFailure,
  resolveAwsSessionOrFail,
  type CheckOutcome,
  emitOutcomes,
} from './shared';

export type { BpaFlags, S3BucketInfo } from './s3-buckets';

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
      // account pass with no findings). Only claim a missing permission when
      // the error actually was one — otherwise surface the real error.
      const failure = b.encryptionReadFailure;
      return {
        kind: 'fail',
        title: `Could not verify encryption: ${b.name}`,
        description: failure
          ? `Encryption status for bucket "${b.name}" could not be read (${failure.error}), so it is unverified.`
          : `Encryption status for bucket "${b.name}" could not be read, so it is unverified.`,
        resourceType: 'aws-s3-bucket',
        resourceId: b.name,
        severity: 'medium',
        remediation: remediationForReadFailure(
          failure,
          'Grant s3:GetEncryptionConfiguration to the integration role so default encryption can be verified, then re-run.',
        ),
        evidence: {
          bucket: b.name,
          encryptionDetermined: false,
          ...(failure ? { readError: failure.error } : {}),
        },
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
      const failure = b.publicAccessReadFailure;
      return {
        kind: 'fail',
        title: `Could not verify public access: ${b.name}`,
        description: failure
          ? `Block Public Access status for bucket "${b.name}" could not be read (${failure.error}), so its public-access posture is unverified.`
          : `Block Public Access status for bucket "${b.name}" could not be read, so its public-access posture is unverified.`,
        resourceType: 'aws-s3-bucket',
        resourceId: b.name,
        severity: 'medium',
        remediation: remediationForReadFailure(
          failure,
          'Grant s3:GetBucketPublicAccessBlock to the integration role so public-access settings can be verified, then re-run.',
        ),
        evidence: {
          bucket: b.name,
          publicAccessDetermined: false,
          ...(failure ? { readError: failure.error } : {}),
        },
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
    const { s3, clientForRegion } = regionalS3Clients(session);
    let buckets: S3BucketInfo[];
    try {
      buckets = await gatherBuckets(s3, {
        encryption: true,
        publicAccess: false,
        log: (message) => ctx.log(message),
        clientForRegion,
      });
    } catch (err) {
      emitOutcomes(ctx, [
        {
          kind: 'fail',
          title: 'Could not verify S3 encryption',
          description:
            'S3 buckets could not be listed, so default encryption could not be verified.',
          resourceType: 'aws-account',
          resourceId: 'account',
          severity: 'medium',
          remediation:
            'Grant s3:ListAllMyBuckets (and s3:GetEncryptionConfiguration) to the integration role, then re-run the check.',
          evidence: { error: err instanceof Error ? err.message : String(err) },
        },
      ]);
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
    const { s3, clientForRegion } = regionalS3Clients(session);

    // Account-level Block Public Access applies to every bucket. Read it once;
    // if denied/absent, fall back to bucket-level only (graceful).
    let accountBpa: BpaFlags | null = null;
    const accountId = awsAccountIdFromCtx(ctx);
    if (accountId) {
      try {
        const s3control = new S3ControlClient({
          region: session.regions[0],
          credentials: session.credentials,
          maxAttempts: 5,
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
      buckets = await gatherBuckets(s3, {
        encryption: false,
        publicAccess: true,
        log: (message) => ctx.log(message),
        clientForRegion,
      });
    } catch (err) {
      emitOutcomes(ctx, [
        {
          kind: 'fail',
          title: 'Could not verify S3 public access',
          description:
            'S3 buckets could not be listed, so Block Public Access could not be verified.',
          resourceType: 'aws-account',
          resourceId: 'account',
          severity: 'medium',
          remediation:
            'Grant s3:ListAllMyBuckets (and s3:GetBucketPublicAccessBlock) to the integration role, then re-run the check.',
          evidence: { error: err instanceof Error ? err.message : String(err) },
        },
      ]);
      return;
    }
    if (buckets.length === 0) return;
    emitOutcomes(ctx, evaluateS3PublicAccess(buckets, accountBpa));
  },
};
