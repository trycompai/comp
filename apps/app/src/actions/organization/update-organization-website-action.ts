// update-organization-name-action.ts

'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { organizationWebsiteSchema } from '../schema';

export const updateOrganizationWebsiteAction = authActionClient
  .inputSchema(organizationWebsiteSchema)
  .metadata({
    name: 'update-organization-website',
    track: {
      event: 'update-organization-website',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { website } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!website) {
      throw new Error('Invalid user input');
    }

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      await db.$transaction(async () => {
        await db.organization.update({
          where: { id: activeOrganizationId ?? '' },
          data: { website },
        });
      });

      revalidatePath('/settings');
      revalidateTag(`organization_${activeOrganizationId}`, 'max');

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      throw new Error('Failed to update organization website');
    }
  });
