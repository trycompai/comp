import type { AwsCommandStep, FixPlan } from './ai-remediation.prompt';

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
]);
const S3_ACL_COMMANDS = new Set(['PutBucketAclCommand']);
const S3_ACL_PERMISSIONS = new Set(['s3:PutBucketAcl']);

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
    removeUnsupportedS3AclSteps(backfillServiceLinkedRoleParams(steps)),
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
