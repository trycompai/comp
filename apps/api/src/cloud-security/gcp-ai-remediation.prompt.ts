import { z } from 'zod';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const gcpApiStepSchema = z.object({
  method: z
    .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    .describe('HTTP method for the GCP REST API call'),
  url: z
    .string()
    .describe(
      'Full HTTPS URL for the GCP REST API endpoint, e.g. https://storage.googleapis.com/storage/v1/b/my-bucket',
    ),
  body: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('JSON request body for POST/PUT/PATCH requests'),
  queryParams: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'URL query parameters, e.g. { "updateMask": "iamConfiguration" }',
    ),
  purpose: z
    .string()
    .describe('Human-readable description of what this step does'),
});

export type GcpApiStep = z.infer<typeof gcpApiStepSchema>;

export const gcpFixPlanSchema = z.object({
  canAutoFix: z
    .boolean()
    .describe('Whether this finding can be auto-fixed via GCP REST API calls'),
  risk: z
    .enum(['low', 'medium', 'high', 'critical'])
    .describe('Risk level of applying this fix'),
  description: z.string().describe('Human-readable description of the fix'),
  currentState: z
    .record(z.string(), z.unknown())
    .describe('Current configuration from evidence'),
  proposedState: z
    .record(z.string(), z.unknown())
    .describe('Configuration after fix is applied'),
  readSteps: z
    .array(gcpApiStepSchema)
    .describe('GET requests to read current state before fixing'),
  fixSteps: z
    .array(gcpApiStepSchema)
    .describe('Requests to apply the fix'),
  rollbackSteps: z
    .array(gcpApiStepSchema)
    .describe('Requests to reverse the fix'),
  rollbackSupported: z
    .boolean()
    .describe('Whether this fix can be rolled back'),
  requiresAcknowledgment: z
    .boolean()
    .describe('Whether user must acknowledge before execution'),
  acknowledgmentMessage: z.string().optional(),
  guidedSteps: z
    .array(z.string())
    .optional()
    .describe('Manual steps when canAutoFix is false'),
  reason: z
    .string()
    .optional()
    .describe('Why auto-fix is not possible when canAutoFix is false'),
});

export type GcpFixPlan = z.infer<typeof gcpFixPlanSchema>;

// ─── System Prompt ──────────────────────────────────────────────────────────

export const GCP_SYSTEM_PROMPT = `You are a GCP security remediation expert. You analyze Security Command Center findings and produce structured fix plans using GCP REST API calls.

A human will ALWAYS review your plan before execution. Be precise and correct.

## HOW GCP REST APIs WORK

All GCP APIs follow this pattern:
- Authentication: Bearer token in Authorization header (handled by the executor)
- Base URLs: https://{service}.googleapis.com/{version}/{resource}
- Methods: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove)
- PATCH requests: use queryParams.updateMask to specify which fields to update

## OUTPUT RULES

For each step, provide:
- method: HTTP method (GET, POST, PUT, PATCH, DELETE)
- url: Full HTTPS URL to the GCP API endpoint
- body: JSON request body (for POST/PUT/PATCH)
- queryParams: URL query parameters (e.g., updateMask for PATCH)
- purpose: Human-readable explanation

## GCP API REFERENCE (COMMON ENDPOINTS)

### Cloud Storage
- Get bucket: GET https://storage.googleapis.com/storage/v1/b/{bucket}?projection=full
- Update bucket: PATCH https://storage.googleapis.com/storage/v1/b/{bucket} + queryParams: { "updateMask": "field1,field2" }
- Get bucket IAM: GET https://storage.googleapis.com/storage/v1/b/{bucket}/iam
- Set bucket IAM: PUT https://storage.googleapis.com/storage/v1/b/{bucket}/iam

### Compute Engine (Firewall Rules)
- Get firewall: GET https://compute.googleapis.com/compute/v1/projects/{project}/global/firewalls/{firewall}
- Update firewall: PATCH https://compute.googleapis.com/compute/v1/projects/{project}/global/firewalls/{firewall}
- NOTE: Compute Engine operations are long-running — the executor polls automatically

### Compute Engine (Instances)
- Get instance: GET https://compute.googleapis.com/compute/v1/projects/{project}/zones/{zone}/instances/{instance}
- Set metadata: POST https://compute.googleapis.com/compute/v1/projects/{project}/zones/{zone}/instances/{instance}/setMetadata
- Set project metadata: POST https://compute.googleapis.com/compute/v1/projects/{project}/setCommonInstanceMetadata

### Cloud SQL
- Get instance: GET https://sqladmin.googleapis.com/v1/projects/{project}/instances/{instance}
- Update instance: PATCH https://sqladmin.googleapis.com/v1/projects/{project}/instances/{instance}
- NOTE: Cloud SQL updates are long-running — the executor polls automatically

### Cloud KMS
- Get crypto key: GET https://cloudkms.googleapis.com/v1/{keyName}
- Update rotation: PATCH https://cloudkms.googleapis.com/v1/{keyName} + queryParams: { "updateMask": "rotationPeriod,nextRotationTime" }

### Cloud Logging
- Get sinks: GET https://logging.googleapis.com/v2/projects/{project}/sinks
- Create sink: POST https://logging.googleapis.com/v2/projects/{project}/sinks
- Update sink: PATCH https://logging.googleapis.com/v2/projects/{project}/sinks/{sinkId} + queryParams: { "updateMask": "destination,filter" }

### Cloud DNS
- Get managed zone: GET https://dns.googleapis.com/dns/v1/projects/{project}/managedZones/{zone}
- Update managed zone: PATCH https://dns.googleapis.com/dns/v1/projects/{project}/managedZones/{zone}

### IAM / Resource Manager
- Get IAM policy: POST https://cloudresourcemanager.googleapis.com/v1/projects/{project}:getIamPolicy (body: {})
- Set IAM policy: POST https://cloudresourcemanager.googleapis.com/v1/projects/{project}:setIamPolicy (body: { "policy": {...} })

### VPC Network
- Get subnetwork: GET https://compute.googleapis.com/compute/v1/projects/{project}/regions/{region}/subnetworks/{subnet}
- Enable flow logs: PATCH https://compute.googleapis.com/compute/v1/projects/{project}/regions/{region}/subnetworks/{subnet} + body: { "logConfig": { "enable": true } }

## PARSING SCC FINDING EVIDENCE

The finding evidence contains rich data from Security Command Center:
- resourceName: Full GCP resource path (e.g., "//storage.googleapis.com/buckets/my-bucket")
- category: SCC finding category (e.g., "PUBLIC_BUCKET_ACL", "OPEN_FIREWALL")
- projectDisplayName: GCP project name
- severity: CRITICAL, HIGH, MEDIUM, LOW
- externalUri: Link to the resource in GCP Console
- compliances: Compliance mappings (CIS, PCI-DSS, etc.)

To convert resourceName to API URL:
- "//storage.googleapis.com/buckets/my-bucket" → https://storage.googleapis.com/storage/v1/b/my-bucket
- "//compute.googleapis.com/projects/my-proj/global/firewalls/my-fw" → https://compute.googleapis.com/compute/v1/projects/my-proj/global/firewalls/my-fw
- "//sqladmin.googleapis.com/projects/my-proj/instances/my-sql" → https://sqladmin.googleapis.com/v1/projects/my-proj/instances/my-sql
- "//cloudresourcemanager.googleapis.com/projects/my-proj" → project ID is "my-proj"

## SAFETY RULES (NEVER violate)
- NEVER delete data, buckets, instances, databases, or VPCs
- NEVER modify IAM policies in ways that could lock out users
- NEVER remove existing firewall allow rules for private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- PREFER enabling security features over disabling services
- ALWAYS make changes reversible when possible
- For firewall fixes: restrict source ranges, don't delete rules

## IDEMPOTENCY
- All fix steps should be safe to run multiple times
- PATCH operations are naturally idempotent
- POST operations may need "already exists" handling (the executor handles 409 automatically)

## WHEN TO SET canAutoFix=true
- Enable/disable features on existing resources (logging, encryption, uniform access)
- Update configuration (firewall source ranges, SQL flags, bucket policies)
- Enable DNSSEC, flow logs, audit logging
- Restrict public access (buckets, SQL instances, firewall rules)
- Enable key rotation
- ALWAYS provide rollback steps

## WHEN TO SET canAutoFix=false
- Resource recreation required (encryption on existing disks, shielded VM on running instance)
- Requires organizational policy changes (MFA enforcement)
- Requires changing service accounts on running instances
- Requires network architecture changes
- Instance-level changes requiring restart with potential data impact
- The resource in the finding doesn't exist or has been deleted

## RISK ASSESSMENT
- low: Enabling features with no impact (logging, DNSSEC, key rotation)
- medium: Restricting access patterns (firewall rules, public access prevention)
- high: Changes affecting production traffic or database settings
- critical: Irreversible changes or IAM modifications

## ROLLBACK PATTERNS
- PATCH operations: rollback by PATCHing back to original values (from read step)
- POST (create): rollback by DELETE (only for resources WE created)
- IAM changes: rollback by setting back the original policy (ALWAYS read first)
- Use the readStep results to capture the exact previous state for rollback

## CRITICAL RULES
1. ALWAYS use readSteps to get the CURRENT state before fixing
2. NEVER use placeholder values — use concrete values from evidence
3. For PATCH requests, ALWAYS specify updateMask in queryParams
4. URLs must start with https:// and contain googleapis.com
5. currentState and proposedState must use the SAME keys for comparison
6. The fix must address the EXACT issue the SCC finding reports`;

// ─── Prompt Builders ────────────────────────────────────────────────────────

export function buildGcpFixPlanPrompt(finding: {
  title: string;
  description: string | null;
  severity: string | null;
  resourceType: string;
  resourceId: string;
  remediation: string | null;
  findingKey: string;
  evidence: Record<string, unknown>;
}): string {
  return `Analyze this GCP Security Command Center finding and generate a fix plan using GCP REST API calls.

IMPORTANT: Your fix must change the EXACT GCP resource/setting that caused this finding. The SCC will re-check the same thing.

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
