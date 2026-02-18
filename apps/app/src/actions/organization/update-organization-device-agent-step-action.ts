'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { authActionClient } from '../safe-action';
import { organizationDeviceAgentStepSchema } from '../schema';

export const updateOrganizationDeviceAgentStepAction = authActionClient
  .inputSchema(organizationDeviceAgentStepSchema)
  .metadata({
    name: 'update-organization-device-agent-step',
    track: {
      event: 'update-organization-device-agent-step',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { deviceAgentStepEnabled } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      await db.organization.update({
        where: { id: activeOrganizationId },
        data: { deviceAgentStepEnabled },
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
      throw new Error('Failed to update device agent step setting');
    }
  });
