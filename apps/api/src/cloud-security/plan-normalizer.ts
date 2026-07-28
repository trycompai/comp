import type { AwsCommandStep, FixPlan } from './ai-remediation.prompt';
import { logGroupNameFromArn } from './providers/aws/cloudwatch.adapter';

/**
 * Maps an AWS service prefix (as it appears in `AwsCommandStep.service`)
 * to the `AWSServiceName` value AWS expects when creating a service-linked
 * role (SLR).
 *
 * Background: when a fix plan needs an SLR, the AI sometimes generates a
 * `CreateServiceLinkedRoleCommand` step without populating `AWSServiceName`.
 * AWS rejects the call with a cryptic "Member must not be null" error. This
 * map lets us backfill the right principal deterministically from
 * cross-step context inside the same plan.
 *
 * Keys include common AI-emitted spellings (with/without hyphens, legacy
 * names). Extend as new adapters add SLR-requiring services.
 */
export const AWS_SERVICE_LINKED_ROLE_PRINCIPAL: Record<string, string> = {
  'config-service': 'config.amazonaws.com',
  config: 'config.amazonaws.com',
  guardduty: 'guardduty.amazonaws.com',
  inspector2: 'inspector2.amazonaws.com',
  inspector: 'inspector2.amazonaws.com',
  macie2: 'macie.amazonaws.com',
  macie: 'macie.amazonaws.com',
  accessanalyzer: 'access-analyzer.amazonaws.com',
  'access-analyzer': 'access-analyzer.amazonaws.com',
  securityhub: 'securityhub.amazonaws.com',
  'security-hub': 'securityhub.amazonaws.com',
  detective: 'detective.amazonaws.com',
  backup: 'backup.amazonaws.com',
};

const SLR_COMMAND = 'CreateServiceLinkedRoleCommand';
const IAM_LIKE_SERVICES = new Set(['iam', 'sts']);
const EC2_SECURITY_GROUP_COMMANDS = new Set([
  'AuthorizeSecurityGroupIngressCommand',
  'RevokeSecurityGroupIngressCommand',
  'AuthorizeSecurityGroupEgressCommand',
  'RevokeSecurityGroupEgressCommand',
]);
const S3_ACL_COMMANDS = new Set(['PutBucketAclCommand']);
const S3_ACL_PERMISSIONS = new Set(['s3:PutBucketAcl']);
const CREATE_LOG_GROUP_COMMAND = 'CreateLogGroupCommand';
/**
 * Fallback CloudWatch Logs log-group name for the CloudTrail→CloudWatch
 * integration fix when the AI omits it and the plan carries no target ARN to
 * derive it from. Matches the name the AWS console itself proposes when you
 * turn on CloudWatch Logs delivery for a trail.
 */
const DEFAULT_CLOUDTRAIL_LOG_GROUP_NAME = 'aws-cloudtrail-logs';
const CLOUDTRAIL_SERVICE = 'cloudtrail';
/**
 * Commands that operate on a CloudTrail trail. A step whose `service` is
 * CloudTrail — or that runs one of these commands — is what marks a plan as the
 * CloudTrail→CloudWatch Logs integration fix, the ONLY remediation the
 * `aws-cloudtrail-logs` default is correct for.
 */
const CLOUDTRAIL_TRAIL_COMMANDS = new Set([
  'CreateTrailCommand',
  'UpdateTrailCommand',
]);

export interface NormalizeFixPlanContext {
  resourceId?: string | null;
}

/**
 * Deterministic post-processing for an AI-generated fix plan. Runs after
 * the model returns to backfill cross-step values the AI does not reliably
 * emit. Today the only backfill is `AWSServiceName` on SLR steps; the
 * function is intentionally extensible so future plan-shape fixes can live
 * here too.
 *
 * Pure, idempotent, and a no-op when the plan is already well-formed.
 */
export function normalizeFixPlan(
  plan: FixPlan,
  context: NormalizeFixPlanContext = {},
): FixPlan {
  const securityGroupId = extractSecurityGroupId(context.resourceId);
  return {
    ...plan,
    requiredPermissions: removeS3AclPermissions(plan.requiredPermissions),
    readSteps: normalizeStepList(plan.readSteps, securityGroupId),
    fixSteps: normalizeStepList(plan.fixSteps, securityGroupId),
    rollbackSteps: normalizeStepList(plan.rollbackSteps, securityGroupId),
  };
}

function normalizeStepList(
  steps: AwsCommandStep[],
  securityGroupId: string | null,
): AwsCommandStep[] {
  return backfillSecurityGroupParams(
    backfillLogGroupName(
      removeUnsupportedS3AclSteps(backfillServiceLinkedRoleParams(steps)),
    ),
    securityGroupId,
  );
}

function removeS3AclPermissions(permissions: string[]): string[] {
  return permissions.filter(
    (permission) => !S3_ACL_PERMISSIONS.has(permission),
  );
}

function removeUnsupportedS3AclSteps(
  steps: AwsCommandStep[],
): AwsCommandStep[] {
  return steps.filter(
    (step) => !(step.service === 's3' && S3_ACL_COMMANDS.has(step.command)),
  );
}

function backfillSecurityGroupParams(
  steps: AwsCommandStep[],
  securityGroupId: string | null,
): AwsCommandStep[] {
  if (!securityGroupId) return steps;

  return steps.map((step) => {
    if (
      step.service !== 'ec2' ||
      !EC2_SECURITY_GROUP_COMMANDS.has(step.command) ||
      step.params?.GroupId ||
      step.params?.GroupName
    ) {
      return step;
    }

    return {
      ...step,
      params: { ...(step.params ?? {}), GroupId: securityGroupId },
    };
  });
}

function extractSecurityGroupId(resourceId?: string | null): string | null {
  if (!resourceId) return null;

  const directMatch = resourceId.match(/^sg-[a-z0-9]+$/i);
  if (directMatch) return directMatch[0];

  const arnMatch = resourceId.match(/security-group\/(sg-[a-z0-9]+)/i);
  return arnMatch?.[1] ?? null;
}

function backfillServiceLinkedRoleParams(
  steps: AwsCommandStep[],
): AwsCommandStep[] {
  return steps.map((step, idx) => {
    if (step.command !== SLR_COMMAND) return step;
    const existing = step.params?.AWSServiceName;
    if (typeof existing === 'string' && existing.length > 0) return step;
    const inferred = inferServiceLinkedRolePrincipal(steps, idx);
    if (!inferred) return step;
    return {
      ...step,
      params: { ...(step.params ?? {}), AWSServiceName: inferred },
    };
  });
}

/**
 * Search outward from `selfIndex` for the nearest non-IAM/STS step whose
 * `service` prefix has a known SLR principal. The right-side neighbor is
 * preferred at equal distance because the SLR step usually appears
 * immediately before the service step that needs it.
 *
 * This nearest-neighbor strategy handles plans with multiple SLR steps
 * targeting different services (e.g., Config + GuardDuty) — each SLR picks
 * up its closest service-step rather than a global "first match" that
 * would assign both to the same principal.
 */
function inferServiceLinkedRolePrincipal(
  allSteps: AwsCommandStep[],
  selfIndex: number,
): string | null {
  const maxOffset = Math.max(selfIndex, allSteps.length - 1 - selfIndex);
  for (let offset = 1; offset <= maxOffset; offset++) {
    for (const candidateIdx of [selfIndex + offset, selfIndex - offset]) {
      if (candidateIdx < 0 || candidateIdx >= allSteps.length) continue;
      const sibling = allSteps[candidateIdx];
      if (IAM_LIKE_SERVICES.has(sibling.service)) continue;
      const principal = AWS_SERVICE_LINKED_ROLE_PRINCIPAL[sibling.service];
      if (principal) return principal;
    }
  }
  return null;
}

/**
 * Backfill `logGroupName` on `CreateLogGroupCommand` steps the AI left empty.
 *
 * The "CloudTrail not integrated with CloudWatch Logs" remediation has to MINT
 * a brand-new log group — the finding carries no existing log-group name
 * (none exists yet), so the model must invent one. When it omits/empties
 * `logGroupName`, AWS rejects the call with "Member must not be null / value
 * null at logGroupName", the single step-repair fails, and the whole auto-fix
 * silently falls back to manual steps. This is the same failure class as the
 * SLR `AWSServiceName` backfill above.
 *
 * Resolve the name deterministically: prefer the log group the plan's trail
 * step already targets (parsed from its `CloudWatchLogsLogGroupArn`) so the
 * group we create matches what UpdateTrail links to; otherwise fall back to the
 * canonical default. Only a missing/empty value is filled — a name the AI
 * supplied is left untouched.
 *
 * Scope: this ONLY runs for the CloudTrail integration plan itself (detected by
 * a CloudTrail trail step). Other logging remediations (SSM Session Manager,
 * Step Functions, Transfer Family, …) also mint a log group via
 * `CreateLogGroupCommand`, but each references it under its own name — stamping
 * them with `aws-cloudtrail-logs` would create a group that doesn't match the
 * sibling step that consumes it.
 */
function backfillLogGroupName(steps: AwsCommandStep[]): AwsCommandStep[] {
  const needsBackfill = steps.some(
    (step) =>
      step.command === CREATE_LOG_GROUP_COMMAND &&
      !hasNonEmptyString(step.params?.logGroupName),
  );
  if (!needsBackfill || !isCloudTrailIntegrationPlan(steps)) return steps;

  const resolved =
    inferCloudTrailLogGroupName(steps) ?? DEFAULT_CLOUDTRAIL_LOG_GROUP_NAME;

  return steps.map((step) => {
    if (
      step.command !== CREATE_LOG_GROUP_COMMAND ||
      hasNonEmptyString(step.params?.logGroupName)
    ) {
      return step;
    }
    return {
      ...step,
      params: { ...(step.params ?? {}), logGroupName: resolved },
    };
  });
}

/**
 * True when the plan operates on a CloudTrail trail — the signal that a minted
 * log group is destined for CloudTrail delivery and the `aws-cloudtrail-logs`
 * default (the name the console proposes for trail log delivery) is correct.
 * Keyed on the CloudTrail SDK client suffix or a trail command so it also
 * matches plans that only create/update the trail without a parseable ARN.
 */
function isCloudTrailIntegrationPlan(steps: AwsCommandStep[]): boolean {
  return steps.some(
    (step) =>
      step.service === CLOUDTRAIL_SERVICE ||
      CLOUDTRAIL_TRAIL_COMMANDS.has(step.command),
  );
}

/**
 * Derive the CloudWatch Logs log-group NAME the plan's CloudTrail step points
 * at, from any step carrying a `CloudWatchLogsLogGroupArn`. Keeps the created
 * log group consistent with the trail integration. Returns null when no step
 * references a parseable log-group ARN.
 */
function inferCloudTrailLogGroupName(steps: AwsCommandStep[]): string | null {
  for (const step of steps) {
    const arn = step.params?.CloudWatchLogsLogGroupArn;
    if (typeof arn === 'string') {
      const name = logGroupNameFromArn(arn);
      if (name) return name;
    }
  }
  return null;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
