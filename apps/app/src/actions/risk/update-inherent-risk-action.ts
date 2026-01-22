'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { updateInherentRiskSchema } from '../schema';

export const updateInherentRiskAction = authActionClient
  .inputSchema(updateInherentRiskSchema)
  .metadata({
    name: 'update-inherent-risk',
    track: {
      event: 'update-inherent-risk',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, probability, impact } = parsedInput;
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      throw new Error('Invalid organization');
    }

    try {
      await db.risk.update({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
        data: {
          likelihood: probability,
          impact,
        },
      });

      revalidatePath(`/${session.activeOrganizationId}/risk`);
      revalidatePath(`/${session.activeOrganizationId}/risk/register`);
      revalidatePath(`/${session.activeOrganizationId}/risk/${id}`);
      revalidateTag('risks', 'max');

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating inherent risk:', error);
      return {
        success: false,
      };
    }
  });
