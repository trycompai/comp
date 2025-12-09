'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';

const archivePolicySchema = z.object({
  id: z.string(),
  action: z.enum(['archive', 'restore']).optional(),
  entityId: z.string(),
});

export const archivePolicyAction = authActionClient
  .inputSchema(archivePolicySchema)
  .metadata({
    name: 'archive-policy',
    track: {
      event: 'archive-policy',
      description: 'Archive Policy',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, action } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      const policy = await db.policy.findUnique({
        where: {
          id,
          organizationId: activeOrganizationId,
        },
      });

      if (!policy) {
        return {
          success: false,
          error: 'Policy not found',
        };
      }

      // Determine if we should archive or restore based on action or current state
      const shouldArchive = action === 'archive' || (action === undefined && !policy.isArchived);

      await db.policy.update({
        where: { id },
        data: {
          isArchived: shouldArchive,
        },
      });

      revalidatePath(`/${activeOrganizationId}/policies/${id}`);
      revalidatePath(`/${activeOrganizationId}/policies/all`);
      revalidatePath(`/${activeOrganizationId}/policies`);
      revalidateTag('policies', 'max');

      return {
        success: true,
        isArchived: shouldArchive,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Failed to update policy archive status',
      };
    }
  });
