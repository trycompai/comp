'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@db';
import type { Prisma } from '@db';
import { authActionClient } from '../safe-action';

const VERSION_CREATE_RETRIES = 3;

const publishVersionSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  changelog: z.string().optional(),
  setAsActive: z.boolean().default(true),
  entityId: z.string(),
});

export const publishVersionAction = authActionClient
  .inputSchema(publishVersionSchema)
  .metadata({
    name: 'publish-policy-version',
    track: {
      event: 'publish-policy-version',
      description: 'Published new policy version',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, changelog, setAsActive } = parsedInput;
    const { activeOrganizationId, userId } = ctx.session;

    if (!activeOrganizationId) {
      return { success: false, error: 'Not authorized' };
    }

    // Get member ID for publishedById
    let memberId: string | null = null;
    if (userId) {
      const member = await db.member.findFirst({
        where: { userId, organizationId: activeOrganizationId, deactivated: false },
        select: { id: true },
      });
      memberId = member?.id ?? null;
    }

    // Get policy
    const policy = await db.policy.findUnique({
      where: { id: policyId, organizationId: activeOrganizationId },
    });

    if (!policy) {
      return { success: false, error: 'Policy not found' };
    }

    const contentToPublish = (
      policy.draftContent && (policy.draftContent as unknown[]).length > 0
        ? policy.draftContent
        : policy.content
    ) as Prisma.InputJsonValue[];

    if (!contentToPublish || contentToPublish.length === 0) {
      return { success: false, error: 'No content to publish' };
    }

    // Create version with retry logic for race conditions
    for (let attempt = 1; attempt <= VERSION_CREATE_RETRIES; attempt++) {
      try {
        const result = await db.$transaction(async (tx) => {
          const latestVersion = await tx.policyVersion.findFirst({
            where: { policyId },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          const nextVersion = (latestVersion?.version ?? 0) + 1;

          const newVersion = await tx.policyVersion.create({
            data: {
              policyId,
              version: nextVersion,
              content: contentToPublish,
              pdfUrl: policy.pdfUrl,
              publishedById: memberId,
              changelog: changelog ?? null,
            },
          });

          await tx.policy.update({
            where: { id: policyId },
            data: {
              content: contentToPublish,
              draftContent: contentToPublish,
              lastPublishedAt: new Date(),
              status: 'published',
              // Clear any pending approval since we're publishing directly
              pendingVersionId: null,
              approverId: null,
              ...(setAsActive !== false && { currentVersionId: newVersion.id }),
            },
          });

          return {
            versionId: newVersion.id,
            version: nextVersion,
          };
        });

        revalidatePath(`/${activeOrganizationId}/policies/${policyId}`);
        revalidatePath(`/${activeOrganizationId}/policies`);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        // Check for unique constraint violation (P2002)
        if (
          error instanceof Error &&
          'code' in error &&
          (error as { code: string }).code === 'P2002' &&
          attempt < VERSION_CREATE_RETRIES
        ) {
          continue;
        }
        throw error;
      }
    }

    return { success: false, error: 'Failed to publish policy version after retries' };
  });
