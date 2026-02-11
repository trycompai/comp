'use server';

import { db, PolicyStatus, type Prisma } from '@db/server';
import { authActionClient } from '../safe-action';

/**
 * Migrates existing policies that don't have versions to have version 1.
 * This is a one-time migration action that should be run for organizations
 * that were created before the versioning feature was introduced.
 *
 * This action:
 * 1. Finds all policies in the organization without a currentVersionId
 * 2. Creates version 1 for each policy using its current content
 * 3. Sets that version as the current (published) version if policy status is published
 */
export const migratePoliciesAction = authActionClient
  .metadata({
    name: 'migrate-policies-to-versioning',
    track: {
      event: 'migrate-policies-to-versioning',
      description: 'Migrate existing policies to versioning system',
      channel: 'server',
    },
  })
  .action(async ({ ctx }) => {
    const { activeOrganizationId } = ctx.session;
    const { user } = ctx;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    if (!user) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    // Get the member ID for associating with versions
    const member = await db.member.findFirst({
      where: {
        userId: user.id,
        organizationId: activeOrganizationId,
        deactivated: false,
      },
      select: { id: true },
    });

    try {
      // Find all policies without a currentVersionId
      const policiesWithoutVersions = await db.policy.findMany({
        where: {
          organizationId: activeOrganizationId,
          currentVersionId: null,
        },
        select: {
          id: true,
          content: true,
          status: true,
          pdfUrl: true,
        },
      });

      if (policiesWithoutVersions.length === 0) {
        return {
          success: true,
          message: 'No policies need migration',
          migratedCount: 0,
        };
      }

      // Migrate each policy in a transaction
      const migratedCount = await db.$transaction(async (tx) => {
        let count = 0;

        for (const policy of policiesWithoutVersions) {
          // Create version 1
          const version = await tx.policyVersion.create({
            data: {
              policyId: policy.id,
              version: 1,
              content: (policy.content as Prisma.InputJsonValue[]) || [],
              pdfUrl: policy.pdfUrl, // Copy over any existing PDF
              publishedById: member?.id || null,
              changelog: 'Migrated from legacy policy',
            },
          });

          // Update policy to set currentVersionId
          // Preserve the original status (draft, needs_review, or published)
          const isPublished = policy.status === PolicyStatus.published;

          await tx.policy.update({
            where: { id: policy.id },
            data: {
              currentVersionId: version.id,
              draftContent: (policy.content as Prisma.InputJsonValue[]) || [],
              // Only set lastPublishedAt if policy is published
              ...(isPublished ? { lastPublishedAt: new Date() } : {}),
              // Status is preserved - no change needed
            },
          });

          count++;
        }

        return count;
      });

      return {
        success: true,
        message: `Successfully migrated ${migratedCount} policies to versioning`,
        migratedCount,
      };
    } catch (error) {
      console.error('Error migrating policies:', error);
      return {
        success: false,
        error: 'Failed to migrate policies',
      };
    }
  });

/**
 * Utility function to migrate a single policy to versioning.
 * Can be called from other server actions or components when needed.
 */
export async function ensurePolicyHasVersion(
  policyId: string,
  organizationId: string,
  memberId?: string,
): Promise<string | null> {
  const policy = await db.policy.findUnique({
    where: { id: policyId, organizationId },
    select: {
      id: true,
      content: true,
      status: true,
      pdfUrl: true,
      currentVersionId: true,
    },
  });

  if (!policy) {
    return null;
  }

  // Already has a version
  if (policy.currentVersionId) {
    return policy.currentVersionId;
  }

  // Create version 1
  const isPublished = policy.status === PolicyStatus.published;

  const version = await db.$transaction(async (tx) => {
    const newVersion = await tx.policyVersion.create({
      data: {
        policyId: policy.id,
        version: 1,
        content: (policy.content as Prisma.InputJsonValue[]) || [],
        pdfUrl: policy.pdfUrl,
        publishedById: memberId || null,
        changelog: 'Migrated from legacy policy',
      },
    });

    await tx.policy.update({
      where: { id: policy.id },
      data: {
        currentVersionId: newVersion.id,
        draftContent: (policy.content as Prisma.InputJsonValue[]) || [],
        // Only set lastPublishedAt if policy is published
        ...(isPublished ? { lastPublishedAt: new Date() } : {}),
      },
    });

    return newVersion;
  });

  return version.id;
}
