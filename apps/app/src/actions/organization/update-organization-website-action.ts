// update-organization-name-action.ts

'use server';

import { db } from '@db';
import { getGT } from 'gt-next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { getOrganizationWebsiteSchema } from '../schema';

export const updateOrganizationWebsiteAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getOrganizationWebsiteSchema(t);
  })
  .metadata({
    name: 'update-organization-website',
    track: {
      event: 'update-organization-website',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const t = await getGT();
    const { website } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!website) {
      throw new Error(t('Invalid user input'));
    }

    if (!activeOrganizationId) {
      throw new Error(t('No active organization'));
    }

    try {
      await db.$transaction(async () => {
        await db.organization.update({
          where: { id: activeOrganizationId ?? '' },
          data: { website },
        });
      });

      revalidatePath('/settings');
      revalidateTag(`organization_${activeOrganizationId}`);

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      throw new Error(t('Failed to update organization website'));
    }
  });
