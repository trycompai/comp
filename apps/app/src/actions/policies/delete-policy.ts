'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { getGT } from 'gt-next/server';
import { authActionClient } from '../safe-action';

const deletePolicySchema = z.object({
  id: z.string(),
  entityId: z.string(),
});

export const deletePolicyAction = authActionClient
  .inputSchema(deletePolicySchema)
  .metadata({
    name: 'delete-policy',
    track: {
      event: 'delete-policy',
      description: 'Delete Policy',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const t = await getGT();
    const { id } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: t('Not authorized'),
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
          error: t('Policy not found'),
        };
      }

      // Delete the policy
      await db.policy.delete({
        where: { id },
      });

      // Revalidate paths to update UI
      revalidatePath(`/${activeOrganizationId}/policies/all`);
      revalidatePath(`/${activeOrganizationId}/policies`);
      revalidateTag('policies');

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: t('Failed to delete policy'),
      };
    }
  });
