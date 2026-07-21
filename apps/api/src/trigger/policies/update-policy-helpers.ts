import { db, Prisma } from '@db';
import type {
  FrameworkEditorFramework,
  FrameworkEditorPolicyTemplate,
  Policy,
} from '@db';
import { logger } from '@trigger.dev/sdk';
import { processTemplate } from './process-policy-template';
import { refineCueLines } from './refine-cue-lines';

export type OrganizationData = {
  id: string;
  name: string | null;
  website: string | null;
};

export type UpdatePolicyParams = {
  organizationId: string;
  policyId: string;
  contextHub: string;
  frameworks: FrameworkEditorFramework[];
  memberId?: string;
};

export type PolicyUpdateResult = {
  policyId: string;
  contextHub: string;
  policyName: string;
  updatedContent: {
    type: 'document';
    content: Record<string, unknown>[];
  };
};

export async function fetchOrganizationAndPolicy(
  organizationId: string,
  policyId: string,
): Promise<{
  organization: OrganizationData;
  policy: Policy;
  policyTemplate: FrameworkEditorPolicyTemplate;
}> {
  const [organization, policy] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, website: true },
    }),
    db.policy.findUnique({
      where: { id: policyId, organizationId },
    }),
  ]);

  if (!organization)
    throw new Error(`Organization not found for ${organizationId}`);
  if (!policy) throw new Error(`Policy not found for ${policyId}`);
  if (!policy.policyTemplateId)
    throw new Error(`Policy template not found for ${policyId}`);

  const policyTemplate = await db.frameworkEditorPolicyTemplate.findUnique({
    where: { id: policy.policyTemplateId },
  });

  if (!policyTemplate)
    throw new Error(`Policy template not found for ${policy.policyTemplateId}`);

  return { organization, policy, policyTemplate };
}

// Mirror PoliciesService.versionCreateRetries: retry version creation on a
// unique-constraint race so two near-simultaneous regenerations don't collide
// on the [policyId, version] key.
const POLICY_VERSION_CREATE_RETRIES = 3;

export async function updatePolicyInDatabase(
  policyId: string,
  content: Record<string, unknown>[],
  memberId?: string,
): Promise<void> {
  try {
    const policy = await db.policy.findUnique({
      where: { id: policyId },
      select: { id: true },
    });

    if (!policy) throw new Error(`Policy not found: ${policyId}`);

    const versionContent = content as unknown as Prisma.InputJsonValue[];

    // Regeneration must NOT mutate the published policy. This previously deleted
    // every version (and its PDF) and overwrote policy.content / currentVersionId
    // while clearing signedBy — replacing the live, signed policy with unreviewed
    // AI content and wiping every signature (CS-766). Instead, create a new DRAFT
    // version holding the regenerated content and leave the published content,
    // currentVersionId, signatures, PDF and existing versions untouched. The draft
    // is reviewed through the normal version workflow; only publishing it (which
    // clears signedBy) re-triggers signing.
    for (
      let attempt = 1;
      attempt <= POLICY_VERSION_CREATE_RETRIES;
      attempt += 1
    ) {
      try {
        await db.$transaction(async (tx) => {
          const latestVersion = await tx.policyVersion.findFirst({
            where: { policyId },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          const nextVersion = (latestVersion?.version ?? 0) + 1;

          await tx.policyVersion.create({
            data: {
              policyId,
              version: nextVersion,
              content: versionContent,
              publishedById: memberId || null,
              changelog: 'Regenerated policy content',
            },
          });
        });
        return;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < POLICY_VERSION_CREATE_RETRIES
        ) {
          continue;
        }
        throw error;
      }
    }
  } catch (dbError) {
    logger.error(`Failed to update policy in database: ${dbError}`);
    throw dbError;
  }
}

export async function processPolicyUpdate(
  params: UpdatePolicyParams,
): Promise<PolicyUpdateResult> {
  const { organizationId, policyId, contextHub, frameworks, memberId } = params;

  const { organization, policyTemplate } = await fetchOrganizationAndPolicy(
    organizationId,
    policyId,
  );

  // Deterministic template processing: fill {{PLACEHOLDER}} values and evaluate
  // {{#if framework}} blocks from the org's real context. Mirrors the
  // bulk/onboarding path and replaces the slow, generic gpt-5-mini
  // full-document generator that ignored the template and produced
  // template-ish output.
  const processedContent = processTemplate({
    content: policyTemplate.content,
    companyName: organization.name ?? 'Company',
    contextHub,
    frameworks,
  });

  // Only fires when the template carries instruction cue lines ("State
  // that...", "Define..."); most policies skip it. Falls back to the
  // deterministic content if the targeted LLM rewrite fails.
  const refinedContent = await refineCueLines(
    processedContent,
    policyTemplate.name,
  );
  const updatedContent = {
    type: 'document' as const,
    content: refinedContent,
  };

  await updatePolicyInDatabase(policyId, updatedContent.content, memberId);

  return {
    policyId,
    contextHub,
    updatedContent,
    policyName: policyTemplate.name,
  };
}
