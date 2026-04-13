import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  type FixPlan,
  type PermissionFix,
  type AwsCommandStep,
  fixPlanSchema,
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
      return object;
    } catch (err) {
      this.logger.error(`AI plan failed: ${err instanceof Error ? err.message : String(err)}`);
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
      return object;
    } catch (err) {
      this.logger.error(`AI refine failed: ${err instanceof Error ? err.message : String(err)}`);
      // Fall back to original plan
      return params.originalPlan;
    }
  }

  /**
   * Dedicated permission analysis: given a complete plan, determine
   * EVERY IAM permission needed. Separate AI call for maximum accuracy.
   */
  async analyzeRequiredPermissions(plan: FixPlan): Promise<string[]> {
    try {
      const allSteps = [...plan.readSteps, ...plan.fixSteps, ...plan.rollbackSteps];
      const stepsDescription = allSteps.map((s) =>
        `${s.service}:${s.command} — ${s.purpose}`
      ).join('\n');

      const { object } = await generateObject({
        model: MODEL,
        schema: completePermissionsSchema,
        system: 'You are an AWS IAM permission expert. Given a list of AWS API calls, determine EVERY IAM permission needed. Be thorough — include all implicit permissions (iam:PassRole when roles are used, s3:PutBucketPolicy when buckets are created, etc.). It is critical that the list is COMPLETE because the customer will add these permissions once and should never need to add more.',
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

      this.logger.log(`AI permission analysis: ${object.permissions.length} permissions identified`);
      return object.permissions;
    } catch (err) {
      this.logger.error(`AI permission analysis failed: ${err instanceof Error ? err.message : String(err)}`);
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
        system: 'You are an AWS IAM permission expert. Analyze the error and determine the exact missing IAM actions.',
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
      this.logger.error(`AI permission fix failed: ${err instanceof Error ? err.message : String(err)}`);

      const actionMatch = params.errorMessage.match(
        /not authorized to perform:\s*([\w:*]+)/i,
      ) ?? params.errorMessage.match(/required\s+([\w:*]+)\s+permission/i);

      const actions = actionMatch?.[1] ? [actionMatch[1]] : [];
      if (actions.length === 0) {
        return {
          missingActions: [],
          policyStatement: { Effect: 'Allow' as const, Action: [], Resource: '*' },
          fixScript: `# Could not determine the missing IAM action from the error. Check the error message and add the required permission manually to the ${REMEDIATION_ROLE_NAME} role.`,
        };
      }
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Action: actions, Resource: '*' }],
      });

      return {
        missingActions: actions,
        policyStatement: { Effect: 'Allow' as const, Action: actions, Resource: '*' },
        fixScript: `aws iam put-role-policy --role-name ${REMEDIATION_ROLE_NAME} --policy-name CompAI-AutoFix --policy-document '${policy}'`,
      };
    }
  }

  // ─── GCP Methods ──────────────────────────────────────────────────────

  async generateGcpFixPlan(finding: FindingContext): Promise<GcpFixPlan> {
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
        `GCP AI plan failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.fallbackGcpPlan(finding);
    }
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

IMPORTANT:
1. Use the REAL GCP STATE above for ALL values in your fix steps. Do NOT guess or use defaults.
2. For rollback steps, use the REAL values from the read steps to restore the previous configuration.
3. Make sure all URLs are correct and complete.

Generate the complete fix plan with EXACT values from the real GCP state.`,
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
    return {
      canAutoFix: false,
      risk: (finding.severity as GcpFixPlan['risk']) ?? 'medium',
      description:
        finding.remediation ?? finding.description ?? 'Check GCP Console.',
      currentState: {},
      proposedState: {},
      readSteps: [],
      fixSteps: [],
      rollbackSteps: [],
      rollbackSupported: false,
      requiresAcknowledgment: false,
      guidedSteps: finding.remediation
        ? [finding.remediation]
        : [
            'Review the finding in GCP Console and apply the recommended fix.',
          ],
      reason: 'AI analysis unavailable. Follow the guided steps.',
    };
  }

  private fallbackPlan(finding: FindingContext): FixPlan {
    return {
      canAutoFix: false,
      risk: (finding.severity === 'info' ? 'low' : finding.severity as FixPlan['risk']) ?? 'medium',
      description: finding.remediation ?? finding.description ?? 'Check AWS documentation.',
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
