import { db, FrameworkEditorFramework, FrameworkEditorPolicyTemplate, type Policy } from '@db/server';
import type { JSONContent } from '@tiptap/react';
import { logger } from '@trigger.dev/sdk';
import { processTemplate } from './process-policy-template';

// Types
export type OrganizationData = {
  id: string;
  name: string | null;
  website: string | null;
};

// Use Prisma `Policy` type downstream instead of a local narrow type

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

/**
 * Fetches organization and policy data from database
 */
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

  if (!organization) {
    throw new Error(`Organization not found for ${organizationId}`);
  }

  if (!policy) {
    throw new Error(`Policy not found for ${policyId}`);
  }

  if (!policy.policyTemplateId) {
    throw new Error(`Policy template not found for ${policyId}`);
  }

  const policyTemplate = await db.frameworkEditorPolicyTemplate.findUnique({
    where: { id: policy.policyTemplateId },
  });

  if (!policyTemplate) {
    throw new Error(`Policy template not found for ${policy.policyTemplateId}`);
  }

  return { organization, policy, policyTemplate };
}

/**
 * Updates policy content in the database with versioning support.
 * Creates a new version 1 and sets it as the current (published) version.
 * Deletes all existing versions first.
 */
export async function updatePolicyInDatabase(
  policyId: string,
  content: Record<string, unknown>[],
  memberId?: string,
): Promise<void> {
  try {
    // First, get the policy to check for existing versions and get their PDF URLs
    const policy = await db.policy.findUnique({
      where: { id: policyId },
      include: {
        versions: {
          select: { id: true, pdfUrl: true },
        },
      },
    });

    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    // Delete S3 files for existing versions if they have PDFs
    // Note: We import S3 client dynamically to avoid issues with Trigger.dev runtime
    const pdfUrlsToDelete = policy.versions
      .map((v) => v.pdfUrl)
      .filter((url): url is string => !!url);

    if (pdfUrlsToDelete.length > 0) {
      try {
        // Dynamic import to work in Trigger.dev context
        const { BUCKET_NAME, s3Client } = await import('@/app/s3');
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

        if (s3Client && BUCKET_NAME) {
          await Promise.allSettled(
            pdfUrlsToDelete.map((pdfUrl) =>
              s3Client.send(
                new DeleteObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: pdfUrl,
                }),
              ),
            ),
          );
        }
      } catch (s3Error) {
        logger.error(`Error deleting S3 files during regeneration: ${s3Error}`);
        // Continue with regeneration even if S3 cleanup fails
      }
    }

    // Use transaction to ensure atomicity - if any step fails, all are rolled back
    await db.$transaction(async (tx) => {
      // Clear version references first to avoid FK constraint issues during deletion
      if (policy.versions.length > 0) {
        await tx.policy.update({
          where: { id: policyId },
          data: { currentVersionId: null, pendingVersionId: null },
        });
        await tx.policyVersion.deleteMany({
          where: { policyId },
        });
      }

      // Create new version 1
      const newVersion = await tx.policyVersion.create({
        data: {
          policyId,
          version: 1,
          content: content as JSONContent[],
          publishedById: memberId || null,
          changelog: 'Regenerated policy content',
        },
      });

      // Update policy with new content and set the new version as current
      await tx.policy.update({
        where: { id: policyId },
        data: {
          content: content as JSONContent[],
          draftContent: content as JSONContent[], // Sync to prevent false "unpublished changes"
          currentVersionId: newVersion.id,
          pendingVersionId: null,
          approverId: null, // Clear any pending approval
          signedBy: [], // Clear signatures for new content
          pdfUrl: null, // Clear policy-level PDF since we're regenerating
          displayFormat: 'EDITOR', // Reset to editor format
        },
      });
    });
  } catch (dbError) {
    logger.error(`Failed to update policy in database: ${dbError}`);
    throw dbError;
  }
}

/**
 * Complete policy update workflow
 */
export async function processPolicyUpdate(params: UpdatePolicyParams): Promise<PolicyUpdateResult> {
  const { organizationId, policyId, contextHub, frameworks, memberId } = params;

  const { organization, policyTemplate } = await fetchOrganizationAndPolicy(
    organizationId,
    policyId,
  );

  const processedContent = processTemplate({
    content: policyTemplate.content,
    companyName: organization.name ?? 'Company',
    contextHub,
    frameworks,
  });

  const updatedContent = { type: 'document' as const, content: processedContent };

  await updatePolicyInDatabase(policyId, updatedContent.content, memberId);

  return {
    policyId,
    contextHub,
    updatedContent,
    policyName: policyTemplate.name,
  };
}
