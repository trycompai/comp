import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import type { CheckContext, FindingSeverity } from '../../../types';
import { retryAssume } from './assume-retry';

export interface AwsSession {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
  regions: string[];
}

export interface AwsCredentialInputs {
  roleArn: string;
  externalId: string;
  regions: string[];
}

/**
 * Resolve role ARN, external ID, and regions from raw connection credentials.
 * Returns null when any is missing (treated as "connection not configured").
 *
 * `regions` is normally a string[]; a single region string (or the legacy
 * singular `region` key) is also accepted, so a value that was collapsed to a
 * scalar upstream still yields a usable region instead of silently resolving to
 * "not configured".
 */
export function resolveAwsCredentialInputs(
  credentials: Record<string, unknown>,
): AwsCredentialInputs | null {
  const roleArn =
    typeof credentials.roleArn === 'string' ? credentials.roleArn : '';
  const externalId =
    typeof credentials.externalId === 'string' ? credentials.externalId : '';
  const rawRegions = credentials.regions;
  const regions = (
    Array.isArray(rawRegions)
      ? rawRegions.filter((r): r is string => typeof r === 'string')
      : typeof rawRegions === 'string'
        ? [rawRegions]
        : typeof credentials.region === 'string'
          ? [credentials.region]
          : []
  ).filter((r) => r.trim().length > 0);

  if (!roleArn || !externalId || regions.length === 0) return null;
  return { roleArn, externalId, regions };
}

/**
 * Short-lived AWS session credentials (or an error) injected into the connection
 * credentials by the Cloud Tests CHECK runner (apps/api `checks-aws-session.ts`)
 * when the cross-account assume was performed in ECS. The underscore-prefixed
 * keys never collide with real connection fields. When present, the check uses
 * these directly instead of assuming the role itself — it runs in the Trigger.dev
 * runtime, which has no base AWS credentials or roleAssumer ARN.
 */
function readInjectedAwsSession(
  credentials: Record<string, unknown>,
):
  | {
      credentials: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken: string;
      };
    }
  | { error: string }
  | null {
  const error = credentials.__resolvedSessionError;
  if (typeof error === 'string' && error.length > 0) {
    return { error };
  }
  const accessKeyId = credentials.__resolvedAccessKeyId;
  const secretAccessKey = credentials.__resolvedSecretAccessKey;
  const sessionToken = credentials.__resolvedSessionToken;
  if (
    typeof accessKeyId === 'string' &&
    typeof secretAccessKey === 'string' &&
    typeof sessionToken === 'string'
  ) {
    return { credentials: { accessKeyId, secretAccessKey, sessionToken } };
  }
  return null;
}

type AwsPartition = 'aws' | 'aws-us-gov';

function awsPartitionForRegion(region: string): AwsPartition {
  return region.startsWith('us-gov-') ? 'aws-us-gov' : 'aws';
}

/** Comp's dedicated roleAssumer role ARN for the partition (set per environment). */
function awsRoleAssumerArn(partition: AwsPartition): string | undefined {
  return partition === 'aws-us-gov'
    ? process.env.SECURITY_HUB_GOVCLOUD_ROLE_ASSUMER_ARN
    : process.env.SECURITY_HUB_ROLE_ASSUMER_ARN;
}

/**
 * Base credentials for hop 1. Commercial AWS uses the task role's default
 * provider chain (undefined); GovCloud uses explicit access keys when set.
 */
function awsBaseCredentials(
  partition: AwsPartition,
): { accessKeyId: string; secretAccessKey: string } | undefined {
  if (partition !== 'aws-us-gov') return undefined;
  const accessKeyId = process.env.SECURITY_HUB_GOVCLOUD_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECURITY_HUB_GOVCLOUD_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return undefined;
  return { accessKeyId, secretAccessKey };
}

/**
 * Assume the customer's cross-account IAM role (role ARN + external ID from the
 * connection credentials) and return temporary credentials + the selected
 * regions. Returns null when the connection isn't configured — the check
 * should then no-op (no false pass).
 *
 * Uses the SAME two-hop chain as Cloud Tests (independent copy): the customer's
 * role trust policy whitelists Comp's dedicated roleAssumer role, NOT the raw
 * task role — so we must (1) assume the roleAssumer from the task/base creds,
 * then (2) assume the customer role with the roleAssumer creds + external ID. A
 * single direct hop fails with "not authorized to perform sts:AssumeRole".
 */
export async function assumeAwsSession(
  ctx: CheckContext,
): Promise<AwsSession | null> {
  const inputs = resolveAwsCredentialInputs(
    ctx.credentials as Record<string, unknown>,
  );
  if (!inputs) return null;
  const { roleArn, externalId, regions } = inputs;

  // If the CHECK runner already resolved a session in ECS (the cross-account
  // assume cannot run in the Trigger.dev runtime, which lacks base AWS creds and
  // the roleAssumer ARN), use it directly. An injected error surfaces the real
  // failure reason via the caller's "Could not assume AWS role" finding.
  const injected = readInjectedAwsSession(
    ctx.credentials as Record<string, unknown>,
  );
  if (injected) {
    if ('error' in injected) throw new Error(injected.error);
    return { credentials: injected.credentials, regions };
  }

  // IAM is global — assume once in the first region; the creds work everywhere.
  const region = regions[0];
  const partition = awsPartitionForRegion(region);

  const roleAssumerArn = awsRoleAssumerArn(partition);
  if (!roleAssumerArn) {
    const envName =
      partition === 'aws-us-gov'
        ? 'SECURITY_HUB_GOVCLOUD_ROLE_ASSUMER_ARN'
        : 'SECURITY_HUB_ROLE_ASSUMER_ARN';
    throw new Error(`Missing ${envName} (Comp roleAssumer ARN).`);
  }

  // Hop 1: task/base creds -> Comp roleAssumer.
  const baseSts = new STSClient({
    region,
    credentials: awsBaseCredentials(partition),
  });
  const assumerResp = await retryAssume(() =>
    baseSts.send(
      new AssumeRoleCommand({
        RoleArn: roleAssumerArn,
        RoleSessionName: 'CompRoleAssumer',
        DurationSeconds: 3600,
      }),
    ),
  );
  const assumer = assumerResp.Credentials;
  if (
    !assumer?.AccessKeyId ||
    !assumer.SecretAccessKey ||
    !assumer.SessionToken
  ) {
    return null;
  }

  // Hop 2: roleAssumer -> customer role (trust policy whitelists the roleAssumer
  // ARN + external ID).
  const assumerSts = new STSClient({
    region,
    credentials: {
      accessKeyId: assumer.AccessKeyId,
      secretAccessKey: assumer.SecretAccessKey,
      sessionToken: assumer.SessionToken,
    },
  });
  const res = await retryAssume(() =>
    assumerSts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        ExternalId: externalId,
        RoleSessionName: 'CompEvidenceCheck',
        DurationSeconds: 3600,
      }),
    ),
  );
  const c = res.Credentials;
  if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) return null;

  return {
    credentials: {
      accessKeyId: c.AccessKeyId,
      secretAccessKey: c.SecretAccessKey,
      sessionToken: c.SessionToken,
    },
    regions,
  };
}

/**
 * Resolve an AWS session, distinguishing "connection not configured" (returns
 * null silently — a legitimate no-op) from "assume-role failed" (e.g. denied,
 * bad ARN/external ID, throttling). On an assume-role failure it emits a
 * "could not verify" finding and returns null, so the failure surfaces as
 * explicit evidence with remediation rather than as a bare check error (or a
 * false non-compliant verdict). Use this instead of assumeAwsSession directly.
 */
export async function resolveAwsSessionOrFail(
  ctx: CheckContext,
): Promise<AwsSession | null> {
  try {
    return await assumeAwsSession(ctx);
  } catch (err) {
    ctx.fail({
      title: 'Could not assume AWS role',
      description:
        'The cross-account IAM role could not be assumed, so this check could not be verified.',
      resourceType: 'aws-account',
      resourceId: 'account',
      severity: 'medium',
      remediation:
        'Verify the role ARN and external ID are correct and the role trust policy allows Comp to assume it, then re-run the check.',
      evidence: { error: err instanceof Error ? err.message : String(err) },
    });
    return null;
  }
}

/** A provider-agnostic pass/fail outcome produced by a pure evaluator. */
export interface CheckOutcome {
  kind: 'pass' | 'fail';
  title: string;
  description: string;
  resourceType: string;
  resourceId: string;
  severity?: FindingSeverity;
  remediation?: string;
  evidence?: Record<string, unknown>;
}

/**
 * The 12-digit AWS account ID from the connection's role ARN
 * (`arn:aws:iam::ACCOUNT_ID:role/...`). Returns null for key-auth connections or
 * when no role ARN is present. Used to attribute every finding to the AWS
 * account it came from — essential when a customer connects multiple accounts.
 */
export function awsAccountIdFromCtx(ctx: CheckContext): string | null {
  const arn = (ctx.credentials as Record<string, unknown>).roleArn;
  if (typeof arn !== 'string') return null;
  const parts = arn.split(':');
  return parts.length >= 5 && parts[4] ? parts[4] : null;
}

/**
 * Map pure evaluator outcomes onto ctx.pass / ctx.fail.
 *
 * Every finding is attributed to the AWS account it came from: checks run once
 * per connected account, so without this the UI shows a single merged list with
 * no way to tell which account each resource belongs to (a customer-reported
 * gap when multiple AWS accounts are connected). The account id is added to the
 * evidence and surfaced in the visible description.
 */
export function emitOutcomes(ctx: CheckContext, outcomes: CheckOutcome[]): void {
  const accountId = awsAccountIdFromCtx(ctx);
  const describe = (description: string) =>
    accountId ? `${description} (AWS account ${accountId})` : description;

  for (const o of outcomes) {
    if (o.kind === 'pass') {
      ctx.pass({
        title: o.title,
        description: describe(o.description),
        resourceType: o.resourceType,
        resourceId: o.resourceId,
        evidence: accountId
          ? { ...(o.evidence ?? {}), awsAccountId: accountId }
          : (o.evidence ?? {}),
      });
    } else {
      ctx.fail({
        title: o.title,
        description: describe(o.description),
        resourceType: o.resourceType,
        resourceId: o.resourceId,
        severity: o.severity ?? 'medium',
        remediation: o.remediation ?? 'Review and remediate this finding.',
        evidence: accountId
          ? { ...(o.evidence ?? {}), awsAccountId: accountId }
          : o.evidence,
      });
    }
  }
}
