'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const deleteFrameworkSchema = z.object({
  id: z.string(),
  entityId: z.string(),
});

export const deleteFrameworkAction = authActionClient
  .inputSchema(deleteFrameworkSchema)
  .metadata({
    name: 'delete-framework',
    track: {
      event: 'delete-framework',
      description: 'Delete Framework Instance',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      const frameworkInstance = await db.frameworkInstance.findUnique({
        where: {
          id,
          organizationId: activeOrganizationId,
        },
      });

      if (!frameworkInstance) {
        return {
          success: false,
          error: 'Framework instance not found',
        };
      }

      // Delete the framework instance
      await db.frameworkInstance.delete({
        where: { id },
      });

      // Revalidate paths to update UI
      revalidatePath(`/${activeOrganizationId}/frameworks`);
      revalidateTag('frameworks', 'max');

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Failed to delete framework instance',
      };
    }
  });
