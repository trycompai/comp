import { db } from '@db';
import type {
  FrameworkEditorFramework,
  FrameworkEditorPolicyTemplate,
  Policy,
  Prisma,
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

export async function updatePolicyInDatabase(
  policyId: string,
  content: Record<string, unknown>[],
  memberId?: string,
): Promise<void> {
  try {
    const policy = await db.policy.findUnique({
      where: { id: policyId },
      include: { versions: { select: { id: true, pdfUrl: true } } },
    });

    if (!policy) throw new Error(`Policy not found: ${policyId}`);

    // Delete S3 files for existing versions
    const pdfUrlsToDelete = policy.versions
      .map((v) => v.pdfUrl)
      .filter((url): url is string => !!url);

    if (pdfUrlsToDelete.length > 0) {
      try {
        const { S3Client, DeleteObjectCommand } =
          await import('@aws-sdk/client-s3');
        const bucketName = process.env.APP_AWS_BUCKET_NAME;
        if (bucketName) {
          const s3 = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
          });
          await Promise.allSettled(
            pdfUrlsToDelete.map((pdfUrl) =>
              s3.send(
                new DeleteObjectCommand({ Bucket: bucketName, Key: pdfUrl }),
              ),
            ),
          );
        }
      } catch (s3Error) {
        logger.error(`Error deleting S3 files during regeneration: ${s3Error}`);
      }
    }

    await db.$transaction(async (tx) => {
      // Clear version references first to avoid FK constraint issues during deletion.
      // Clear approverId alongside pendingVersionId so the two fields never diverge
      // — any lingering approverId without a pending version produces the inconsistent
      // state behind CS-254/260/261 ("No pending version to approve").
      if (policy.versions.length > 0) {
        await tx.policy.update({
          where: { id: policyId },
          data: {
            currentVersionId: null,
            pendingVersionId: null,
            approverId: null,
          },
        });
        await tx.policyVersion.deleteMany({ where: { policyId } });
      }

      const newVersion = await tx.policyVersion.create({
        data: {
          policyId,
          version: 1,
          content: content as unknown as Prisma.InputJsonValue[],
          publishedById: memberId || null,
          changelog: 'Regenerated policy content',
        },
      });

      await tx.policy.update({
        where: { id: policyId },
        data: {
          content: content as unknown as Prisma.InputJsonValue[],
          draftContent: content as unknown as Prisma.InputJsonValue[],
          currentVersionId: newVersion.id,
          pendingVersionId: null,
          approverId: null,
          signedBy: [],
          pdfUrl: null,
          displayFormat: 'EDITOR',
        },
      });
    });
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
