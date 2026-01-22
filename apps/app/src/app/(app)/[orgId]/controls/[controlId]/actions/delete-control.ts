'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const deleteControlSchema = z.object({
  id: z.string(),
  entityId: z.string(),
});

export const deleteControlAction = authActionClient
  .inputSchema(deleteControlSchema)
  .metadata({
    name: 'delete-control',
    track: {
      event: 'delete-control',
      description: 'Delete Control',
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
      const control = await db.control.findUnique({
        where: {
          id,
          organizationId: activeOrganizationId,
        },
      });

      if (!control) {
        return {
          success: false,
          error: 'Control not found',
        };
      }

      // Delete the control
      await db.control.delete({
        where: { id },
      });

      // Revalidate paths to update UI
      revalidatePath(`/${activeOrganizationId}/controls/all`);
      revalidatePath(`/${activeOrganizationId}/controls`);
      revalidateTag('controls', 'max');

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Failed to delete control',
      };
    }
  });
