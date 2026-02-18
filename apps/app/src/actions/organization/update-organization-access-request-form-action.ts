'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { authActionClient } from '../safe-action';
import { organizationAccessRequestFormSchema } from '../schema';

export const updateOrganizationAccessRequestFormAction = authActionClient
  .inputSchema(organizationAccessRequestFormSchema)
  .metadata({
    name: 'update-organization-access-request-form',
    track: {
      event: 'update-organization-access-request-form',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { accessRequestFormEnabled } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      await db.organization.update({
        where: { id: activeOrganizationId },
        data: { accessRequestFormEnabled },
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
      throw new Error('Failed to update access request form setting');
    }
  });
