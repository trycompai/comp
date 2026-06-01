import {
  GetBucketEncryptionCommand,
  GetPublicAccessBlockCommand,
  ListBucketsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { assumeAwsSession, type CheckOutcome, emitOutcomes } from './shared';

export interface S3BucketInfo {
  name: string;
  encrypted: boolean;
  publicAccessBlocked: boolean;
}

export function evaluateS3Encryption(buckets: S3BucketInfo[]): CheckOutcome[] {
  return buckets.map((b) =>
    b.encrypted
      ? {
          kind: 'pass',
          title: `Default encryption enabled: ${b.name}`,
          description: `Bucket "${b.name}" has default encryption enabled.`,
          resourceType: 'aws-s3-bucket',
          resourceId: b.name,
          evidence: { bucket: b.name },
        }
      : {
          kind: 'fail',
          title: `No default encryption: ${b.name}`,
          description: `Bucket "${b.name}" does not have default server-side encryption enabled.`,
          resourceType: 'aws-s3-bucket',
          resourceId: b.name,
          severity: 'high',
          remediation: 'Enable default encryption (SSE-S3 or SSE-KMS) on the bucket.',
          evidence: { bucket: b.name },
        },
  );
}

export function evaluateS3PublicAccess(buckets: S3BucketInfo[]): CheckOutcome[] {
  return buckets.map((b) =>
    b.publicAccessBlocked
      ? {
          kind: 'pass',
          title: `Public access blocked: ${b.name}`,
          description: `Bucket "${b.name}" has S3 Block Public Access fully enabled.`,
          resourceType: 'aws-s3-bucket',
          resourceId: b.name,
          evidence: { bucket: b.name },
        }
      : {
          kind: 'fail',
          title: `Public access not fully blocked: ${b.name}`,
          description: `Bucket "${b.name}" does not have all S3 Block Public Access settings enabled.`,
          resourceType: 'aws-s3-bucket',
          resourceId: b.name,
          severity: 'high',
          remediation: 'Enable all four S3 Block Public Access settings on the bucket (or account).',
          evidence: { bucket: b.name },
        },
  );
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
    let publicAccessBlocked = false;

    if (opts.encryption) {
      try {
        const enc = await s3.send(new GetBucketEncryptionCommand({ Bucket: name }));
        encrypted = (enc.ServerSideEncryptionConfiguration?.Rules?.length ?? 0) > 0;
      } catch {
        encrypted = false; // no encryption config
      }
    }
    if (opts.publicAccess) {
      try {
        const pab = await s3.send(new GetPublicAccessBlockCommand({ Bucket: name }));
        const c = pab.PublicAccessBlockConfiguration;
        publicAccessBlocked = Boolean(
          c?.BlockPublicAcls &&
            c?.IgnorePublicAcls &&
            c?.BlockPublicPolicy &&
            c?.RestrictPublicBuckets,
        );
      } catch {
        publicAccessBlocked = false; // no public access block config
      }
    }
    infos.push({ name, encrypted, publicAccessBlocked });
  }
  return infos;
}

export const s3EncryptionCheck: IntegrationCheck = {
  id: 'aws-s3-encryption',
  name: 'S3 — default encryption enabled',
  description: 'Verify all S3 buckets have default server-side encryption enabled.',
  service: 's3',
  taskMapping: TASK_TEMPLATES.encryptionAtRest,
  run: async (ctx: CheckContext) => {
    const session = await assumeAwsSession(ctx);
    if (!session) {
      ctx.log('AWS S3 encryption check: connection not configured — skipping');
      return;
    }
    const s3 = new S3Client({
      region: session.regions[0],
      credentials: session.credentials,
    });
    const buckets = await gatherBuckets(s3, { encryption: true, publicAccess: false });
    if (buckets.length === 0) return;
    emitOutcomes(ctx, evaluateS3Encryption(buckets));
  },
};

export const s3PublicAccessCheck: IntegrationCheck = {
  id: 'aws-s3-public-access',
  name: 'S3 — public access blocked',
  description: 'Verify all S3 buckets have S3 Block Public Access fully enabled.',
  service: 's3',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,
  run: async (ctx: CheckContext) => {
    const session = await assumeAwsSession(ctx);
    if (!session) {
      ctx.log('AWS S3 public-access check: connection not configured — skipping');
      return;
    }
    const s3 = new S3Client({
      region: session.regions[0],
      credentials: session.credentials,
    });
    const buckets = await gatherBuckets(s3, { encryption: false, publicAccess: true });
    if (buckets.length === 0) return;
    emitOutcomes(ctx, evaluateS3PublicAccess(buckets));
  },
};
