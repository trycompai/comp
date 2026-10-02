import { z } from 'zod';

export const taskStatusAccessSchema = z.object({
  organizationId: z.string().min(1),
  permissions: z.record(z.string(), z.array(z.string())),
});

const runSchema = z.object({
  taskIdentifier: z.string(),
  tags: z.array(z.string()),
  status: z.string(),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  payload: z
    .object({
      organizationId: z.string().optional(),
      scoreContext: z.object({ organizationId: z.string() }).passthrough().optional(),
    })
    .passthrough(),
});

// Only reviewed customer tasks may expose output through this generic route.
// A new task must declare every resource whose private data its output contains.
const readResources = new Map<string, readonly string[]>([
  ['update-policy', ['policy']],
  ['generate-full-policies', ['policy']],
  ['migrate-policies-for-org', ['policy']],
  ['generate-vendor-mitigation', ['vendor']],
  ['generate-vendor-mitigations-for-org', ['vendor']],
  ['score-vendor-risk', ['vendor']],
  ['research-vendor', ['vendor']],
  ['generate-risk-mitigation', ['risk']],
  ['generate-risk-mitigations-for-org', ['risk']],
  ['link-risks-and-vendors-to-work', ['risk', 'vendor', 'task']],
  ['generate-auditor-content', ['audit']],
  ['initialize-organization', ['organization', 'framework']],
  ['onboard-organization', ['organization', 'policy', 'vendor', 'risk']],
  ['run-integration-tests', ['integration']],
  ['send-integration-results', ['integration']],
  ['run-cloud-security-scan', ['integration']],
  ['run-connection-checks', ['integration']],
  ['run-task-integration-checks', ['integration', 'task']],
  ['run-org-integration-checks', ['integration', 'task']],
  ['run-device-sync', ['integration', 'member']],
  ['remediate-preview', ['integration']],
  ['remediate-single', ['integration']],
  ['remediate-batch', ['integration']],
  ['parse-questionnaire', ['questionnaire']],
  ['answer-question', ['questionnaire']],
  ['auto-answer-questionnaire', ['questionnaire']],
]);

export function authorizeRun({
  rawRun,
  access,
}: {
  rawRun: unknown;
  access: z.infer<typeof taskStatusAccessSchema>;
}) {
  const parsed = runSchema.safeParse(rawRun);
  if (!parsed.success) return null;
  const run = parsed.data;
  const resources = readResources.get(run.taskIdentifier);
  if (!resources?.every((resource) => access.permissions[resource]?.includes('read'))) {
    return null;
  }

  // Both legacy frontend triggers and API workers use organization tags.
  // Reject runs carrying more than one tenant, even if one matches the caller.
  const owners = new Set(
    run.tags
      .filter((tag) => tag.startsWith('org_') || tag.startsWith('org:'))
      .map((tag) => (tag.startsWith('org:') ? tag.slice(4) : tag)),
  );
  if (owners.size !== 1 || !owners.has(access.organizationId)) return null;

  const payloadOwner = run.payload.organizationId ?? run.payload.scoreContext?.organizationId;
  // Vendor research can contain only a public website; all other allowed
  // tasks carry their tenant in the payload as well as their tags.
  if (!payloadOwner && run.taskIdentifier !== 'research-vendor') return null;
  if (payloadOwner && payloadOwner !== access.organizationId) return null;
  if (
    run.payload.scoreContext &&
    run.payload.scoreContext.organizationId !== access.organizationId
  ) {
    return null;
  }
  return run;
}
