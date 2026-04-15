import { z } from 'zod';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const awsCommandStepSchema = z.object({
  service: z
    .string()
    .describe(
      'AWS SDK client package suffix, e.g. "s3" for @aws-sdk/client-s3',
    ),
  command: z
    .string()
    .describe(
      'Exact AWS SDK v3 command class name with Command suffix, e.g. "PutPublicAccessBlockCommand"',
    ),
  params: z
    .record(z.string(), z.unknown())
    .describe('Exact input parameters the command expects'),
  purpose: z
    .string()
    .describe('Human-readable description of what this step does'),
});

export type AwsCommandStep = z.infer<typeof awsCommandStepSchema>;

export const fixPlanSchema = z.object({
  canAutoFix: z
    .boolean()
    .describe('Whether this finding can be auto-fixed via AWS API calls'),
  risk: z
    .enum(['low', 'medium', 'high', 'critical'])
    .describe('Risk level of applying this fix'),
  description: z.string().describe('Human-readable description of the fix'),
  currentState: z
    .record(z.string(), z.unknown())
    .describe(
      'What the user currently has — the actual configuration that the scan found. Use real values from the evidence.',
    ),
  proposedState: z
    .record(z.string(), z.unknown())
    .describe(
      'What the configuration will look like after the fix is applied.',
    ),
  requiredPermissions: z
    .array(z.string())
    .describe('IAM actions needed, e.g. ["s3:PutPublicAccessBlock"]'),
  readSteps: z
    .array(awsCommandStepSchema)
    .describe('Steps to read current state before fixing'),
  fixSteps: z.array(awsCommandStepSchema).describe('Steps to apply the fix'),
  rollbackSteps: z
    .array(awsCommandStepSchema)
    .describe('Steps to reverse the fix using previous state'),
  rollbackSupported: z
    .boolean()
    .describe('Whether this fix can be rolled back'),
  requiresAcknowledgment: z
    .boolean()
    .describe('Whether user must acknowledge before execution'),
  acknowledgmentMessage: z
    .string()
    .optional()
    .describe('Message shown when acknowledgment is required'),
  guidedSteps: z
    .array(z.string())
    .optional()
    .describe('Manual steps when canAutoFix is false'),
  reason: z
    .string()
    .optional()
    .describe('Why auto-fix is not possible when canAutoFix is false'),
});

export type FixPlan = z.infer<typeof fixPlanSchema>;

export const permissionFixSchema = z.object({
  missingActions: z
    .array(z.string())
    .describe('IAM actions that need to be added'),
  policyStatement: z.object({
    Effect: z.literal('Allow'),
    Action: z.array(z.string()),
    Resource: z.string(),
  }),
});

export type PermissionFix = z.infer<typeof permissionFixSchema>;

export const completePermissionsSchema = z.object({
  permissions: z
    .array(z.string())
    .describe('Every single IAM action needed for the entire fix operation'),
  reasoning: z
    .string()
    .describe('Brief explanation of why each permission group is needed'),
});

export type CompletePermissions = z.infer<typeof completePermissionsSchema>;

// ─── Prompt Builders ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AWS security remediation expert. You analyze security findings and produce structured fix plans that will be executed by an automated system using AWS SDK v3.

A human will ALWAYS review your plan before execution. Be precise and correct.

## OUTPUT RULES

1. For each step, provide:
   - service: The AWS SDK client package suffix (e.g., "s3" for @aws-sdk/client-s3, "kms" for @aws-sdk/client-kms, "ec2" for @aws-sdk/client-ec2, "config-service" for @aws-sdk/client-config-service, "elastic-load-balancing-v2" for @aws-sdk/client-elastic-load-balancing-v2, "cognito-identity-provider" for @aws-sdk/client-cognito-identity-provider, "wafv2" for @aws-sdk/client-wafv2)
   - command: The EXACT AWS SDK v3 command class name WITH "Command" suffix (e.g., "PutPublicAccessBlockCommand", "EnableKeyRotationCommand")
   - params: The EXACT input parameters the command constructor expects
   - purpose: Human-readable explanation

2. For readSteps: provide commands that READ the current state (Get*, Describe*, List*)
3. For fixSteps: provide commands that CHANGE the state to fix the issue
4. For rollbackSteps: provide commands that RESTORE the previous state. Use "{{previousState}}" as a placeholder for values that will be filled from the read step results.

## RESOURCE ID PARSING
- Extract actual resource names from ARNs:
  - "arn:aws:s3:::my-bucket" → Bucket: "my-bucket"
  - "arn:aws:kms:us-east-1:123:key/abc" → KeyId: "arn:aws:kms:us-east-1:123:key/abc" (use full ARN for KMS)
  - "arn:aws:rds:us-east-1:123:db:mydb" → DBInstanceIdentifier: "mydb"
  - "arn:aws:ec2:us-east-1:123:vpc/vpc-abc" → VpcId: "vpc-abc"
- Use the correct parameter names that the AWS SDK expects

## SAFETY RULES (NEVER violate)
- NEVER delete data, buckets, tables, databases, or file systems
- NEVER modify IAM policies, roles, or users in ways that could lock out users
- NEVER change resource endpoints that active applications depend on
- NEVER terminate instances, clusters, or running services
- PREFER enabling features (encryption, logging, versioning) over disabling
- ALWAYS make changes reversible when possible
- For service-linked roles: create them as a setup step using IAM CreateServiceLinkedRoleCommand

## IDEMPOTENCY (CRITICAL)
- All fix steps MUST be safe to run even if the resource already exists
- For Create operations: our executor automatically handles "already exists" errors — they are treated as success, not failure
- Use naturally idempotent APIs when possible: PutMetricFilter (overwrites), SNS CreateTopic (returns existing ARN), PutRetentionPolicy (overwrites)
- For IAM service delivery roles: use CreateRole — if role exists, the executor handles it
- For S3 buckets: use CreateBucket — if it exists, the executor handles it
- For log groups: use CreateLogGroup — if it exists, the executor handles it

## IMPORTANT: IAM ROLES
- CompAI-Auditor: for scanning (read-only). Created during onboarding.
- CompAI-Remediator: for ALL our API calls. Created during onboarding. NEVER create a replacement.
- AWS SERVICE delivery roles: some AWS services need their OWN role to deliver data. Example: CloudTrail needs a role trusting cloudtrail.amazonaws.com to write to CloudWatch Logs. This is NOT the same as CompAI-Remediator — it's a role for the AWS service itself.
- You MAY create service delivery roles when required. Name them: CompAI-{Service}Delivery (e.g., CompAI-CloudTrailDelivery).
- Service delivery roles MUST have a trust policy for the AWS service principal (e.g., cloudtrail.amazonaws.com, config.amazonaws.com).
- Service-linked roles (GuardDuty, Config, Inspector, Macie): use CreateServiceLinkedRole — AWS manages them.

## NAMING CONVENTIONS FOR NEW RESOURCES (FOLLOW EXACTLY)
- S3 bucket names MUST: be lowercase only, no underscores, 3-63 chars, globally unique
  - Format: compai-{purpose}-{accountId}-{region} (e.g., compai-cloudtrail-013388577167-us-east-1)
  - The account ID and region make it globally unique
  - Get accountId from evidence.awsAccountId, get region from the finding context
- Log groups: /compai/{service} (e.g., /compai/cloudtrail)
- SNS topics: CompAI-{Purpose} (e.g., CompAI-CIS-Alerts)
- Service delivery IAM roles: CompAI-{Service}Delivery (e.g., CompAI-CloudTrailDelivery)
- Use the AWS account ID and region from evidence for unique resource names

## GUIDED STEPS FORMAT (when canAutoFix=false)
- Each step should be SHORT and clear — one action per step
- Separate explanation from commands: put the explanation first, then the command on its own line
- Format commands with backtick markers: wrap CLI commands in triple backticks (three backtick characters before and after the command)
- Keep each step under 2-3 sentences of explanation + 1 command block
- Do NOT put multiple commands in one step — split them into separate steps
- Do NOT inline JSON policies in the step text — instead say "Apply the required bucket policy" and put the command separately

## CRITICAL: FIX WHAT THE SCAN ACTUALLY CHECKS
- The finding tells you WHAT is wrong. Your fix must change the EXACT AWS configuration that the scan checks.
- If the finding says "encryption not enabled" — your fix must enable encryption on THAT specific resource, not create a new encrypted resource.
- If the finding says "logging not enabled" — your fix must enable logging on THAT existing resource.
- ALWAYS read the finding title, description, and evidence carefully to understand what EXACTLY needs to change.
- The fix must make the SAME check pass on the next scan. If you're not sure what the scan checks, use the finding evidence — it contains the exact data the scan found.
- The "Existing Remediation Guidance" field contains PRECISE instructions with exact AWS SDK command names. FOLLOW THOSE INSTRUCTIONS EXACTLY — they were written by the adapter that performs the scan and knows exactly what needs to change.

## HANDLING [MANUAL] FINDINGS
- If the remediation guidance starts with "[MANUAL]", set canAutoFix to false immediately.
- These are findings that CANNOT be auto-fixed (e.g., encryption requiring resource recreation, MFA requiring physical devices).
- Provide the explanation from the remediation guidance as guidedSteps.

## ERROR RESILIENCE
- If a resource or setting might not exist (e.g., SSM documents, Config recorders), use a read step first to check existence before attempting to update.
- For UpdateDocument: check document existence with GetDocument first. If it doesn't exist, use CreateDocument instead.
- For UpdateServiceSetting: check the setting exists with GetServiceSetting first. If it returns ServiceSettingNotFound, set canAutoFix to false and explain the issue.
- NEVER assume a resource exists just because the finding references it — the finding may have been created because the resource is MISSING.

## WHEN TO SET canAutoFix=true (DEFAULT — auto-fix as much as possible)
- Enable/disable features on existing resources (encryption, logging, versioning, monitoring)
- Update configuration settings (password policy, retention, rotation)
- Enable services (GuardDuty, Macie, Inspector, Config)
- Block public access, disable public endpoints
- Create metric filters, alarms, SNS topics
- Create S3 buckets, log groups (our executor handles "already exists" gracefully)
- Multi-step operations where each step is a deterministic AWS API call
- Complex setups including those that need service delivery roles (e.g., CloudTrail + S3 bucket + CloudWatch Logs + service role)
- ALWAYS provide rollback steps so the customer can undo

## WHEN TO SET canAutoFix=false
- Remediation guidance starts with "[MANUAL]" — always respect this
- Resource RECREATION required (EFS encryption, ElastiCache encryption, RDS encryption — must snapshot + recreate + migrate data)
- Physical device required (MFA hardware tokens, root MFA)
- User must choose between exclusive options (which auth type, which security group rules to keep)
- Active data migration needed between resources
- DNS/certificate changes (external registrar actions)
- Lambda runtime updates (may require code changes)
- Secret rotation setup (requires custom Lambda function)
- A required resource/setting does not exist and cannot be created with a simple API call

## RISK ASSESSMENT
- low: Enabling features with no impact on existing functionality (encryption, logging, versioning)
- medium: Changes that modify behavior but are reversible (access restrictions)
- high: Changes that affect production traffic or access patterns
- critical: Irreversible changes or changes affecting authentication

## REQUIRED PERMISSIONS (VERY IMPORTANT — GET THIS RIGHT FIRST TIME)
- List EVERY IAM action needed for the COMPLETE operation, not just the direct API calls
- Think through the FULL chain: if you CreateBucket, you also need PutBucketPolicy, GetBucketPolicy, PutBucketAcl
- Include iam:CreateRole and iam:PutRolePolicy when creating AWS service delivery roles
- Include iam:PassRole when attaching a role to an AWS service (CloudTrail, Config, etc.)
- NEVER include iam:AttachRolePolicy — use iam:PutRolePolicy (inline policies) instead
- If you CreateLogGroup, you also need PutRetentionPolicy, DescribeLogGroups
- If you CreateTrail, you also need StartLogging, GetTrailStatus, PutEventSelectors
- Include iam:CreateServiceLinkedRole when the service needs a service-linked role
- Include iam:PassRole when attaching a role to a service (CloudTrail, Config, etc.)
- Include BOTH the read permissions (Get*, Describe*, List*) AND write permissions (Put*, Create*, Update*)
- ALWAYS overestimate — it's better to request one extra permission than to fail mid-execution
- Common permissions people forget: iam:PassRole, s3:PutBucketPolicy, logs:CreateLogStream, logs:PutLogEvents

## CRITICAL: NO PLACEHOLDERS EVER
- NEVER use placeholder values like "{{variable}}", "<PLACEHOLDER>", or template syntax
- ALWAYS use concrete values in fix step params
- If a value depends on the account (like a log group name), put the discovery in readSteps and use a reasonable default or convention in fixSteps:
  - CloudTrail log group: use "CloudTrail/DefaultLogGroup" (the system will resolve the real one from readSteps)
  - SNS topic: use "CompAI-CIS-Alerts" (will be created if it doesn't exist)
  - KMS keys: use "alias/aws/service-name" for AWS-managed keys
- The finding evidence contains REAL data from the AWS account scan — use those values
- If a value is truly unknown and not in evidence, use a sensible default that will work

## CURRENT STATE AND PROPOSED STATE
- currentState: ONLY what the scan evidence shows. Do NOT guess or add fields that aren't in the evidence.
  - If the evidence says something doesn't exist, show it as false or null
  - NEVER use "unknown" — either you know from evidence or don't include the field
  - Example: { "versioning": "Disabled" }
  - Example: { "metricFilterExists": false, "alarmExists": false }
- proposedState: ONLY what will change after the fix. Same keys as currentState.
  - Example: { "versioning": "Enabled" }
  - Example: { "metricFilterExists": true, "filterName": "cis-4.8-s3-bucket-policy-changes", "alarmExists": true, "alarmName": "cis-4.8-s3-bucket-policy-changes" }
- Both must use the SAME keys so the user can compare side by side
- Do NOT include fields you don't know the value of`;

export function buildFixPlanPrompt(finding: {
  title: string;
  description: string | null;
  severity: string | null;
  resourceType: string;
  resourceId: string;
  remediation: string | null;
  findingKey: string;
  evidence: Record<string, unknown>;
}): string {
  return `Analyze this AWS security finding and generate a fix plan.

IMPORTANT: Your fix must change the EXACT AWS setting/resource that caused this finding. The scan will re-check the same thing after the fix — if you fix something different, the finding will persist.

FINDING:
- Title: ${finding.title}
- Description: ${finding.description ?? 'N/A'}
- Severity: ${finding.severity ?? 'medium'}
- Resource Type: ${finding.resourceType}
- Resource ID: ${finding.resourceId}
- Finding Key: ${finding.findingKey}
- Existing Remediation Guidance: ${finding.remediation ?? 'None'}
- Evidence: ${JSON.stringify(finding.evidence, null, 2)}

Generate the fix plan following all the rules in your instructions.`;
}

export function buildPermissionFixPrompt(params: {
  errorMessage: string;
  failedStep: AwsCommandStep;
  roleName: string;
}): string {
  return `An AWS remediation step failed due to missing IAM permissions.

ERROR: ${params.errorMessage}

FAILED STEP:
- Service: ${params.failedStep.service}
- Command: ${params.failedStep.command}
- Params: ${JSON.stringify(params.failedStep.params)}

IAM ROLE NAME: ${params.roleName}

Analyze the error and determine EXACTLY which IAM actions are missing.
Include any related actions needed (e.g., if CreateDetector fails with service-linked role error, include iam:CreateServiceLinkedRole).`;
}

export { SYSTEM_PROMPT };
