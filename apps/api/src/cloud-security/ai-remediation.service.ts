import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  type FixPlan,
  type PermissionFix,
  type AwsCommandStep,
  fixPlanSchema,
  awsCommandStepSchema,
  permissionFixSchema,
  completePermissionsSchema,
  SYSTEM_PROMPT,
  buildFixPlanPrompt,
  buildPermissionFixPrompt,
} from './ai-remediation.prompt';
import {
  type GcpFixPlan,
  gcpFixPlanSchema,
  GCP_SYSTEM_PROMPT,
  buildGcpFixPlanPrompt,
} from './gcp-ai-remediation.prompt';
import {
  type AzureFixPlan,
  azureFixPlanSchema,
  AZURE_SYSTEM_PROMPT,
  buildAzureFixPlanPrompt,
} from './azure-ai-remediation.prompt';
import { normalizeFixPlan } from './plan-normalizer';

const MODEL = anthropic('claude-opus-4-6');
const REMEDIATION_ROLE_NAME = 'CompAI-Remediator';

interface FindingContext {
  title: string;
  description: string | null;
  severity: string | null;
  resourceType: string;
  resourceId: string;
  remediation: string | null;
  findingKey: string;
  evidence: Record<string, unknown>;
}

@Injectable()
export class AiRemediationService {
  private readonly logger = new Logger(AiRemediationService.name);

  /** Phase 1: Generate initial plan (read steps + preliminary fix plan). */
  async generateFixPlan(finding: FindingContext): Promise<FixPlan> {
    try {
      const { object } = await generateObject({
        model: MODEL,
        schema: fixPlanSchema,
        system: SYSTEM_PROMPT,
        prompt: buildFixPlanPrompt(finding),
        temperature: 0,
      });

      this.logger.log(
        `AI plan for ${finding.findingKey}: canAutoFix=${object.canAutoFix}, risk=${object.risk}`,
      );
      return normalizeFixPlan(enrichEmptyState(object));
    } catch (err) {
      this.logger.error(
        `AI plan failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.fallbackPlan(finding);
    }
  }

  /**
   * Phase 2: Refine fix steps using REAL data from AWS.
   * Called after read steps executed successfully.
   * AI gets the actual AWS state and generates exact fix commands.
   */
  async refineFixPlan(params: {
    finding: FindingContext;
    originalPlan: FixPlan;
    realAwsState: Record<string, unknown>;
  }): Promise<FixPlan> {
    try {
      const { object } = await generateObject({
        model: MODEL,
        schema: fixPlanSchema,
        system: SYSTEM_PROMPT,
        prompt: `You previously analyzed this finding and generated read steps. Those read steps have been executed against the REAL AWS account. Here is the REAL data:

REAL AWS STATE (from executing read steps):
${JSON.stringify(params.realAwsState, null, 2)}

ORIGINAL FINDING:
${buildFixPlanPrompt(params.finding)}

IMPORTANT:
1. Use the REAL AWS STATE above for ALL values in your fix steps. Do NOT guess or use defaults.
2. For requiredPermissions: list EVERY SINGLE IAM permission needed for ALL steps — read, fix, AND rollback. Think through the entire execution chain. If step 1 creates a bucket, you need s3:CreateBucket, s3:PutBucketPolicy, s3:GetBucketPolicy. If step 2 creates a role, you need iam:CreateRole, iam:PutRolePolicy, iam:GetRole, iam:PassRole. If step 3 creates a trail, you need cloudtrail:CreateTrail, cloudtrail:StartLogging, cloudtrail:GetTrailStatus, cloudtrail:DescribeTrails, cloudtrail:PutEventSelectors. Include EVERYTHING — the customer will add these permissions ONCE and should never need to add more.
3. ALWAYS overestimate permissions. It is much better to request 5 extra permissions than to fail mid-execution because one was missing.

Generate the complete fix plan with EXACT values from the real AWS state.`,
        temperature: 0,
      });

      this.logger.log(`AI refined plan for ${params.finding.findingKey}`);
      return normalizeFixPlan(enrichEmptyState(object));
    } catch (err) {
      this.logger.error(
        `AI refine failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Fall back to original plan
      return normalizeFixPlan(enrichEmptyState(params.originalPlan));
    }
  }

  /**
   * Dedicated permission analysis: given a complete plan, determine
   * EVERY IAM permission needed. Separate AI call for maximum accuracy.
   */
  async analyzeRequiredPermissions(plan: FixPlan): Promise<string[]> {
    try {
      const allSteps = [
        ...plan.readSteps,
        ...plan.fixSteps,
        ...plan.rollbackSteps,
      ];
      const stepsDescription = allSteps
        .map((s) => `${s.service}:${s.command} — ${s.purpose}`)
        .join('\n');

      const { object } = await generateObject({
        model: MODEL,
        schema: completePermissionsSchema,
        system:
          'You are an AWS IAM permission expert. Given a list of AWS API calls, determine EVERY IAM permission needed. Be thorough — include all implicit permissions (iam:PassRole when roles are used, s3:PutBucketPolicy when buckets are created, etc.). It is critical that the list is COMPLETE because the customer will add these permissions once and should never need to add more.',
        prompt: `These are the exact AWS SDK commands that will be executed:

${stepsDescription}

Full step details:
${JSON.stringify(allSteps, null, 2)}

List EVERY IAM action needed. Include:
- The direct permission for each command (e.g., CreateBucketCommand → s3:CreateBucket)
- Implicit permissions (e.g., creating a bucket also needs s3:PutBucketPolicy, s3:GetBucketAcl)
- Dependent permissions (e.g., iam:PassRole when passing a role to CloudTrail)
- Read permissions needed for validation (e.g., cloudtrail:GetTrailStatus after creating a trail)

OVERESTIMATE. Better to have 5 extra permissions than to miss one.`,
        temperature: 0,
      });

      this.logger.log(
        `AI permission analysis: ${object.permissions.length} permissions identified`,
      );
      return object.permissions;
    } catch (err) {
      this.logger.error(
        `AI permission analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Fallback to plan's requiredPermissions
      return plan.requiredPermissions;
    }
  }

  /** When a fix fails due to missing permissions. */
  async suggestPermissionFix(params: {
    errorMessage: string;
    failedStep: AwsCommandStep;
  }): Promise<PermissionFix & { fixScript: string }> {
    try {
      const { object } = await generateObject({
        model: MODEL,
        schema: permissionFixSchema,
        system:
          'You are an AWS IAM permission expert. Analyze the error and determine the exact missing IAM actions.',
        prompt: buildPermissionFixPrompt({
          errorMessage: params.errorMessage,
          failedStep: params.failedStep,
          roleName: REMEDIATION_ROLE_NAME,
        }),
        temperature: 0,
      });

      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [object.policyStatement],
      });

      return {
        ...object,
        fixScript: `aws iam put-role-policy --role-name ${REMEDIATION_ROLE_NAME} --policy-name CompAI-AutoFix --policy-document '${policy}'`,
      };
    } catch (err) {
      this.logger.error(
        `AI permission fix failed: ${err instanceof Error ? err.message : String(err)}`,
      );

      const actionMatch =
        params.errorMessage.match(/not authorized to perform:\s*([\w:*]+)/i) ??
        params.errorMessage.match(/required\s+([\w:*]+)\s+permission/i);

      const actions = actionMatch?.[1] ? [actionMatch[1]] : [];
      if (actions.length === 0) {
        return {
          missingActions: [],
          policyStatement: {
            Effect: 'Allow' as const,
            Action: [],
            Resource: '*',
          },
          fixScript: `# Could not determine the missing IAM action from the error. Check the error message and add the required permission manually to the ${REMEDIATION_ROLE_NAME} role.`,
        };
      }
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Action: actions, Resource: '*' }],
      });

      return {
        missingActions: actions,
        policyStatement: {
          Effect: 'Allow' as const,
          Action: actions,
          Resource: '*',
        },
        fixScript: `aws iam put-role-policy --role-name ${REMEDIATION_ROLE_NAME} --policy-name CompAI-AutoFix --policy-document '${policy}'`,
      };
    }
  }

  /**
   * Universal step-level repair. Called by the executor when AWS rejects
   * a step with a validation-class error AND the rules-based fixer in
   * `tryAutoFixValidationError` couldn't resolve it.
   *
   * The AI sees the failing step, AWS's exact error message, the
   * surrounding plan, and the finding context, and returns a corrected
   * step (same service + command, refined params). Returns null when the
   * model declines to refine — the executor then surfaces AWS's error
   * unchanged.
   *
   * This is the universal escape hatch for "AI omitted a required AWS
   * param" bugs: no per-command map, no hardcoded principal table — the
   * AI uses AWS's own validation message as ground truth.
   */
  async refineStepFromError(params: {
    step: AwsCommandStep;
    awsError: string;
    finding: FindingContext;
    planContext: Pick<FixPlan, 'fixSteps' | 'readSteps'>;
  }): Promise<AwsCommandStep | null> {
    try {
      const neighbors = [
        ...params.planContext.readSteps.map((s) => ({ role: 'read', ...s })),
        ...params.planContext.fixSteps.map((s) => ({ role: 'fix', ...s })),
      ].filter((s) => s.command !== params.step.command || s.purpose !== params.step.purpose);

      const { object } = await generateObject({
        model: MODEL,
        schema: awsCommandStepSchema,
        system:
          'You are repairing a single AWS auto-remediation step that the AWS SDK rejected with a validation error. Return a corrected step with the SAME service and SAME command — only the params should change. Use the AWS error message to identify exactly which field is wrong and why. Use neighbor steps and the finding context to infer the right value. If you cannot fix it without external information, return the original step unchanged.',
        prompt: `FAILING STEP:
service: ${params.step.service}
command: ${params.step.command}
purpose: ${params.step.purpose}
params: ${JSON.stringify(params.step.params ?? {}, null, 2)}

AWS SDK ERROR (verbatim):
${params.awsError}

OTHER STEPS IN THE SAME PLAN (for context — DO NOT include their params in the output):
${JSON.stringify(neighbors, null, 2)}

FINDING BEING FIXED:
title: ${params.finding.title}
description: ${params.finding.description ?? '(none)'}
resourceType: ${params.finding.resourceType}
resourceId: ${params.finding.resourceId}
remediation guidance: ${params.finding.remediation ?? '(none)'}
evidence: ${JSON.stringify(params.finding.evidence ?? {}, null, 2)}

INSTRUCTIONS:
1. Read the AWS error carefully — it tells you which field is wrong.
2. If the error says "Member must not be null" or "must not be empty" for a field X, populate X with the correct value (from finding evidence, neighbor steps, or AWS conventions like service principals).
3. If the error says "failed to satisfy constraint" or "regular expression pattern", fix the value to match.
4. Keep the same service and command — do not switch to a different API.
5. Return a complete AwsCommandStep with all required schema fields.`,
        temperature: 0,
      });

      this.logger.log(
        `Step repair for ${params.step.command}: returned ${JSON.stringify(
          object.params ?? {},
        ).slice(0, 200)}`,
      );

      // Defensive: if the AI swapped the service or command (against
      // instructions), discard the refinement — the executor would
      // reject it anyway and we don't want to retry with a different API.
      if (
        object.service !== params.step.service ||
        object.command !== params.step.command
      ) {
        this.logger.warn(
          `Step repair returned a different service/command — ` +
            `expected ${params.step.service}:${params.step.command}, got ` +
            `${object.service}:${object.command}. Discarding refinement.`,
        );
        return null;
      }

      return object;
    } catch (err) {
      this.logger.error(
        `AI step repair failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  // ─── GCP Methods ──────────────────────────────────────────────────────

  async generateGcpFixPlan(finding: FindingContext): Promise<GcpFixPlan> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { object } = await generateObject({
          model: MODEL,
          schema: gcpFixPlanSchema,
          system: GCP_SYSTEM_PROMPT,
          prompt: buildGcpFixPlanPrompt(finding),
          temperature: 0,
        });

        this.logger.log(
          `GCP AI plan for ${finding.findingKey}: canAutoFix=${object.canAutoFix}, risk=${object.risk}`,
        );
        return object;
      } catch (err) {
        this.logger.error(
          `GCP AI plan failed (attempt ${attempt + 1}): ${err instanceof Error ? err.message : String(err)}`,
        );
        if (attempt === 0) continue;
        return this.fallbackGcpPlan(finding);
      }
    }
    return this.fallbackGcpPlan(finding);
  }

  async refineGcpFixPlan(params: {
    finding: FindingContext;
    originalPlan: GcpFixPlan;
    realGcpState: Record<string, unknown>;
  }): Promise<GcpFixPlan> {
    try {
      const { object } = await generateObject({
        model: MODEL,
        schema: gcpFixPlanSchema,
        system: GCP_SYSTEM_PROMPT,
        prompt: `You previously analyzed this GCP finding and generated read steps. Those read steps have been executed against the REAL GCP account. Here is the REAL data:

REAL GCP STATE (from executing read steps):
${JSON.stringify(params.realGcpState, null, 2)}

ORIGINAL FINDING:
${buildGcpFixPlanPrompt(params.finding)}

CRITICAL INSTRUCTIONS:
1. The "body" field in each fix step must contain EXACT JSON that will be sent to the GCP API. No descriptions, no placeholders, no human-readable text — ONLY valid JSON objects.
2. Use the REAL GCP STATE above for ALL values. Copy existing data structures exactly as they appear.
3. For setIamPolicy: the body MUST be { "policy": { "bindings": [...ALL existing bindings from real state...], "etag": "...from real state...", "version": 3, "auditConfigs": [...existing plus your additions...] } }. Copy the ENTIRE policy from the read step, then add/modify only what's needed.
4. For audit logging: add this to the policy's auditConfigs array: { "service": "allServices", "auditLogConfigs": [{"logType": "ADMIN_READ"}, {"logType": "DATA_READ"}, {"logType": "DATA_WRITE"}] }
5. For rollback: the body must restore the EXACT original policy from the read step (copy it verbatim).
6. The "body" field is sent directly as JSON to fetch(). If it contains strings like "enabled for all services" instead of actual JSON, the API will ignore it silently.

Generate the complete fix plan with EXACT JSON values from the real GCP state.`,
        temperature: 0,
      });

      this.logger.log(`GCP AI refined plan for ${params.finding.findingKey}`);
      return object;
    } catch (err) {
      this.logger.error(
        `GCP AI refine failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return params.originalPlan;
    }
  }

  // ─── Azure Methods ────────────────────────────────────────────────────

  async generateAzureFixPlan(finding: FindingContext): Promise<AzureFixPlan> {
    try {
      const { object } = await generateObject({
        model: MODEL,
        schema: azureFixPlanSchema,
        system: AZURE_SYSTEM_PROMPT,
        prompt: buildAzureFixPlanPrompt(finding),
        temperature: 0,
      });

      this.logger.log(
        `Azure AI plan for ${finding.findingKey}: canAutoFix=${object.canAutoFix}, risk=${object.risk}`,
      );
      return object;
    } catch (err) {
      this.logger.error(
        `Azure AI plan failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.fallbackAzurePlan(finding);
    }
  }

  async refineAzureFixPlan(params: {
    finding: FindingContext;
    originalPlan: AzureFixPlan;
    realAzureState: Record<string, unknown>;
  }): Promise<AzureFixPlan> {
    try {
      const { object } = await generateObject({
        model: MODEL,
        schema: azureFixPlanSchema,
        system: AZURE_SYSTEM_PROMPT,
        prompt: `You previously analyzed this Azure finding and generated read steps. Those read steps have been executed against the REAL Azure account. Here is the REAL data:

REAL AZURE STATE (from executing read steps):
${JSON.stringify(params.realAzureState, null, 2)}

ORIGINAL FINDING:
${buildAzureFixPlanPrompt(params.finding)}

IMPORTANT:
1. Use the REAL AZURE STATE above for ALL values in your fix steps. Do NOT guess or use defaults.
2. For rollback steps, use the REAL values from the read steps to restore the previous configuration.
3. Make sure all URLs include the correct api-version parameter.

Generate the complete fix plan with EXACT values from the real Azure state.`,
        temperature: 0,
      });

      this.logger.log(`Azure AI refined plan for ${params.finding.findingKey}`);
      return object;
    } catch (err) {
      this.logger.error(
        `Azure AI refine failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return params.originalPlan;
    }
  }

  private fallbackAzurePlan(finding: FindingContext): AzureFixPlan {
    return {
      canAutoFix: false,
      risk: (finding.severity as AzureFixPlan['risk']) ?? 'medium',
      description:
        finding.remediation ?? finding.description ?? 'Check Azure Portal.',
      currentState: {},
      proposedState: {},
      readSteps: [],
      fixSteps: [],
      rollbackSteps: [],
      rollbackSupported: false,
      requiresAcknowledgment: false,
      guidedSteps: finding.remediation
        ? [finding.remediation]
        : ['Review the finding in Azure Portal and apply the recommended fix.'],
      reason: 'AI analysis unavailable. Follow the guided steps.',
    };
  }

  private fallbackGcpPlan(finding: FindingContext): GcpFixPlan {
    const evidence = finding.evidence ?? {};
    const externalUri = evidence.externalUri as string | undefined;
    const projectName =
      (evidence.projectDisplayName as string) ?? 'your project';

    const steps: string[] = [];
    if (externalUri) {
      steps.push(
        `Open the resource in GCP Console: ${externalUri}`,
      );
    }
    if (finding.remediation) {
      // Split SCC remediation text into separate steps if it contains "More info:" or multiple sentences
      const parts = finding.remediation
        .split(/(?:More info:|Compliance:)/i)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts[0]) steps.push(parts[0]);
      if (parts[1]) steps.push(`Reference: ${parts[1]}`);
    }
    if (steps.length === 0) {
      steps.push(
        `Review the finding "${finding.title}" in the GCP Console for project ${projectName} and apply the recommended fix.`,
      );
    }

    return {
      canAutoFix: false,
      risk: (finding.severity as GcpFixPlan['risk']) ?? 'medium',
      description:
        finding.description ?? finding.remediation ?? 'Check GCP Console.',
      currentState: {},
      proposedState: {},
      readSteps: [],
      fixSteps: [],
      rollbackSteps: [],
      rollbackSupported: false,
      requiresAcknowledgment: false,
      guidedSteps: steps,
      reason: 'This finding requires manual remediation in the GCP Console.',
    };
  }

  private fallbackPlan(finding: FindingContext): FixPlan {
    return {
      canAutoFix: false,
      risk:
        (finding.severity === 'info'
          ? 'low'
          : (finding.severity as FixPlan['risk'])) ?? 'medium',
      description:
        finding.remediation ??
        finding.description ??
        'Check AWS documentation.',
      currentState: {},
      proposedState: {},
      requiredPermissions: [],
      readSteps: [],
      fixSteps: [],
      rollbackSteps: [],
      rollbackSupported: false,
      requiresAcknowledgment: false,
      guidedSteps: finding.remediation
        ? [finding.remediation]
        : ['Review the finding in AWS Console and apply the recommended fix.'],
      reason: 'AI analysis unavailable. Follow the guided steps.',
    };
  }
}

/** Action-style prefixes the AI uses for steps that change AWS state. */
const ACTIONABLE_PREFIXES = [
  'Create',
  'Put',
  'Update',
  'Modify',
  'Start',
  'Enable',
  'Attach',
  'Set',
] as const;

/**
 * Deterministic backstop: if the AI returns BOTH currentState and
 * proposedState as empty (rendering as `{} → {}` in the Auto-Remediate
 * dialog), derive a meaningful diff from the plan's actionable fix steps.
 *
 * - When the plan contains `Create*` commands, emit
 *   `{ exists: false }` → `{ exists: true, willCreate: [...] }` so the UI
 *   keeps the existing create-from-scratch language for findings like
 *   "No CloudTrail trails configured".
 * - When the plan contains only configure/enable-style commands
 *   (`PutConfigurationRecorderCommand`, `StartConfigurationRecorderCommand`,
 *   `EnableMacieCommand`, ...), emit
 *   `{ configured: false }` → `{ configured: true, willChange: [...] }`
 *   instead of claiming creation.
 *
 * Only kicks in when BOTH states are empty — verify-only plans that
 * legitimately have one side blank are untouched.
 */
function enrichEmptyState(plan: FixPlan): FixPlan {
  const currentEmpty = isEmptyState(plan.currentState);
  const proposedEmpty = isEmptyState(plan.proposedState);
  if (!currentEmpty || !proposedEmpty) return plan;

  const willCreate: string[] = [];
  const willChange: string[] = [];
  for (const step of plan.fixSteps ?? []) {
    const command = typeof step?.command === 'string' ? step.command : '';
    const prefix = ACTIONABLE_PREFIXES.find((p) => command.startsWith(p));
    if (!prefix) continue;
    const resource = command.replace(/Command$/, '').replace(/^[A-Z][a-z]+/, '');
    const label = step.service ? `${step.service}:${resource}` : resource;
    if (prefix === 'Create') {
      if (!willCreate.includes(label)) willCreate.push(label);
    } else if (!willChange.includes(label)) {
      willChange.push(label);
    }
  }

  // Create-from-scratch plan: emit exists:false → exists:true so the UI
  // keeps the existing "we'll create this" language for findings like
  // "No CloudTrail trails configured". Non-Create steps in the same plan
  // (e.g., StartLoggingCommand on the just-created trail) are bundled
  // into the resource being created, so we don't double-list them.
  if (willCreate.length > 0) {
    return {
      ...plan,
      currentState: { exists: false },
      proposedState: { exists: true, willCreate },
    };
  }

  // Pure configure / enable / update flow: surface what will change
  // without claiming creation. This is the Bug B fix — previously plans
  // with only Put*/Start*/Update* steps left both states empty.
  if (willChange.length > 0) {
    return {
      ...plan,
      currentState: { configured: false },
      proposedState: { configured: true, willChange },
    };
  }

  // No actionable steps detected — leave the plan alone rather than
  // fabricating state.
  return plan;
}

function isEmptyState(
  state: Record<string, unknown> | null | undefined,
): boolean {
  return !state || Object.keys(state).length === 0;
}
