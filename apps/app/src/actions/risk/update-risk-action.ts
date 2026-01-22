// update-risk-action.ts

'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { updateRiskSchema } from '../schema';

export const updateRiskAction = authActionClient
  .inputSchema(updateRiskSchema)
  .metadata({
    name: 'update-risk',
    track: {
      event: 'update-risk',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, title, description, category, department, assigneeId, status } = parsedInput;
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      throw new Error('Invalid user input');
    }

    try {
      await db.risk.update({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
        data: {
          title: title,
          description: description,
          assigneeId: assigneeId,
          category: category,
          department: department,
          status: status,
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
      console.error('Error updating risk:', error);

      return {
        success: false,
      };
    }
  });
