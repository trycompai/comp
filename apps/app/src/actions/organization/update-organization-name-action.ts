// update-organization-name-action.ts

'use server';

import { db } from '@db';
import { getGT } from 'gt-next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { getOrganizationNameSchema } from '../schema';

export const updateOrganizationNameAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getOrganizationNameSchema(t);
  })
  .metadata({
    name: 'update-organization-name',
    track: {
      event: 'update-organization-name',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const t = await getGT();
    const { name } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!name) {
      throw new Error(t('Invalid user input'));
    }

    if (!activeOrganizationId) {
      throw new Error(t('No active organization'));
    }

    try {
      await db.$transaction(async () => {
        await db.organization.update({
          where: { id: activeOrganizationId ?? '' },
          data: { name },
        });
      });

      revalidatePath('/settings');
      revalidateTag(`organization_${activeOrganizationId}`);

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      throw new Error(t('Failed to update organization name'));
    }
  });
