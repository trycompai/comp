'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { authActionClient } from '../safe-action';
import { organizationAdvancedModeSchema } from '../schema';

export const updateOrganizationAdvancedModeAction = authActionClient
  .inputSchema(organizationAdvancedModeSchema)
  .metadata({
    name: 'update-organization-advanced-mode',
    track: {
      event: 'update-organization-advanced-mode',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { advancedModeEnabled } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      await db.$transaction(async () => {
        await db.organization.update({
          where: { id: activeOrganizationId },
          data: { advancedModeEnabled },
        });
      });

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);
      revalidateTag(`organization_${activeOrganizationId}`, 'max');

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      throw new Error('Failed to update advanced mode setting');
    }
  });
