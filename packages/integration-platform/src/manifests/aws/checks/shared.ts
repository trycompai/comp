import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import type { CheckContext, FindingSeverity } from '../../../types';

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
 * Which hop of the role-assumption chain failed:
 *  - `config`        — Comp-side config (missing roleAssumer ARN env var)
 *  - `role-assumer`  — Comp-side (could not assume our own roleAssumer role)
 *  - `customer-role` — customer-side (their role's trust policy / external ID)
 *
 * `config` and `role-assumer` are internal failures — the customer's AWS setup
 * is fine and they should NOT be told to change their IAM.
 */
export type AssumeHop = 'config' | 'role-assumer' | 'customer-role';

/** Error raised while assuming the customer's role, tagged with the failed hop. */
export class AwsAssumeError extends Error {
  constructor(
    message: string,
    readonly hop: AssumeHop,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AwsAssumeError';
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface AssumeFailureClassification {
  hop: AssumeHop;
  /** true when the failure is on Comp's side, not the customer's AWS config. */
  isInternal: boolean;
  error: string;
  description: string;
  remediation: string;
}

/**
 * Turn an assume-role failure into accurate, customer-facing copy. The key
 * point: only a `customer-role` (hop 2) failure means the customer needs to
 * check their role ARN / external ID / trust policy. A `config` or
 * `role-assumer` failure is on us — telling the customer to "verify your role
 * ARN" there is wrong and is exactly what confused this customer. The real
 * underlying error is always included so the failure is diagnosable.
 */
export function describeAssumeFailure(
  err: unknown,
): AssumeFailureClassification {
  const hop: AssumeHop =
    err instanceof AwsAssumeError ? err.hop : 'customer-role';
  const error = errorMessage(err);
  const isInternal = hop === 'config' || hop === 'role-assumer';
  return {
    hop,
    isInternal,
    error,
    description: isInternal
      ? `This check could not run due to an internal issue on Comp's side, not your AWS configuration (${error}). Our team has been notified.`
      : `The cross-account IAM role could not be assumed, so this check could not be verified (${error}).`,
    remediation: isInternal
      ? 'No action is needed on your side — Comp will resolve this and the check will pass on the next run.'
      : "Verify the role ARN and external ID are correct and the role's trust policy allows Comp's roleAssumer to assume it with that external ID, then re-run the check.",
  };
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

  // IAM is global — assume once in the first region; the creds work everywhere.
  const region = regions[0];
  const partition = awsPartitionForRegion(region);

  const roleAssumerArn = awsRoleAssumerArn(partition);
  if (!roleAssumerArn) {
    const envName =
      partition === 'aws-us-gov'
        ? 'SECURITY_HUB_GOVCLOUD_ROLE_ASSUMER_ARN'
        : 'SECURITY_HUB_ROLE_ASSUMER_ARN';
    throw new AwsAssumeError(
      `Missing ${envName} (Comp roleAssumer ARN).`,
      'config',
    );
  }

  // Hop 1: task/base creds -> Comp roleAssumer. A failure here is on Comp's
  // side (our runtime can't assume our own roleAssumer), not the customer's.
  const baseSts = new STSClient({
    region,
    credentials: awsBaseCredentials(partition),
  });
  let assumerResp;
  try {
    assumerResp = await baseSts.send(
      new AssumeRoleCommand({
        RoleArn: roleAssumerArn,
        RoleSessionName: 'CompRoleAssumer',
        DurationSeconds: 3600,
      }),
    );
  } catch (err) {
    throw new AwsAssumeError(
      `Failed to assume Comp roleAssumer: ${errorMessage(err)}`,
      'role-assumer',
      err,
    );
  }
  const assumer = assumerResp.Credentials;
  if (
    !assumer?.AccessKeyId ||
    !assumer.SecretAccessKey ||
    !assumer.SessionToken
  ) {
    throw new AwsAssumeError(
      'Comp roleAssumer returned no credentials.',
      'role-assumer',
    );
  }

  // Hop 2: roleAssumer -> customer role (trust policy whitelists the roleAssumer
  // ARN + external ID). A failure here points at the customer's trust policy /
  // external ID.
  const assumerSts = new STSClient({
    region,
    credentials: {
      accessKeyId: assumer.AccessKeyId,
      secretAccessKey: assumer.SecretAccessKey,
      sessionToken: assumer.SessionToken,
    },
  });
  let res;
  try {
    res = await assumerSts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        ExternalId: externalId,
        RoleSessionName: 'CompEvidenceCheck',
        DurationSeconds: 3600,
      }),
    );
  } catch (err) {
    throw new AwsAssumeError(
      `Failed to assume the customer role: ${errorMessage(err)}`,
      'customer-role',
      err,
    );
  }
  const c = res.Credentials;
  if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) {
    throw new AwsAssumeError(
      'The customer role returned no credentials.',
      'customer-role',
    );
  }

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
    const classified = describeAssumeFailure(err);
    ctx.fail({
      title: 'Could not assume AWS role',
      description: classified.description,
      resourceType: 'aws-account',
      resourceId: 'account',
      severity: 'medium',
      remediation: classified.remediation,
      evidence: { hop: classified.hop, error: classified.error },
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

/** Map pure evaluator outcomes onto ctx.pass / ctx.fail. */
export function emitOutcomes(ctx: CheckContext, outcomes: CheckOutcome[]): void {
  for (const o of outcomes) {
    if (o.kind === 'pass') {
      ctx.pass({
        title: o.title,
        description: o.description,
        resourceType: o.resourceType,
        resourceId: o.resourceId,
        evidence: o.evidence ?? {},
      });
    } else {
      ctx.fail({
        title: o.title,
        description: o.description,
        resourceType: o.resourceType,
        resourceId: o.resourceId,
        severity: o.severity ?? 'medium',
        remediation: o.remediation ?? 'Review and remediate this finding.',
        evidence: o.evidence,
      });
    }
  }
}
