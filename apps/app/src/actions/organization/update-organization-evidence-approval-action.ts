'use server';

import { db } from '@db/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { authActionClient } from '../safe-action';
import { organizationEvidenceApprovalSchema } from '../schema';

export const updateOrganizationEvidenceApprovalAction = authActionClient
  .inputSchema(organizationEvidenceApprovalSchema)
  .metadata({
    name: 'update-organization-evidence-approval',
    track: {
      event: 'update-organization-evidence-approval',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { evidenceApprovalEnabled } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      await db.organization.update({
        where: { id: activeOrganizationId },
        data: { evidenceApprovalEnabled },
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
      throw new Error('Failed to update evidence approval setting');
    }
  });
