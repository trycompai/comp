'use server';

import { db, type Prisma } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';

const discardDraftChangesSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  entityId: z.string(),
});

export const discardDraftChangesAction = authActionClient
  .inputSchema(discardDraftChangesSchema)
  .metadata({
    name: 'discard-policy-draft-changes',
    track: {
      event: 'discard-policy-draft-changes',
      description: 'Discarded policy draft changes',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId } = parsedInput;
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

    try {
      // Get the policy with its current active version
      const policy = await db.policy.findUnique({
        where: { id: policyId, organizationId: activeOrganizationId },
        include: {
          currentVersion: true,
        },
      });

      if (!policy) {
        return {
          success: false,
          error: 'Policy not found',
        };
      }

      // Reset draft to the active version content, or to empty if no active version
      const contentToRestore = (policy.currentVersion?.content ??
        policy.content ??
        []) as Prisma.InputJsonValue[];

      await db.policy.update({
        where: { id: policyId },
        data: {
          draftContent: contentToRestore,
        },
      });

      revalidatePath(`/${activeOrganizationId}/policies/${policyId}`);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error discarding policy draft changes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to discard draft changes',
      };
    }
  });
