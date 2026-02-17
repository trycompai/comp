'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { authActionClient } from '../safe-action';
import { organizationWhistleblowerReportSchema } from '../schema';

export const updateOrganizationWhistleblowerReportAction = authActionClient
  .inputSchema(organizationWhistleblowerReportSchema)
  .metadata({
    name: 'update-organization-whistleblower-report',
    track: {
      event: 'update-organization-whistleblower-report',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { whistleblowerReportEnabled } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      await db.organization.update({
        where: { id: activeOrganizationId },
        data: { whistleblowerReportEnabled },
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
      throw new Error('Failed to update whistleblower report setting');
    }
  });
