// update-risk-action.ts

'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { getGT } from 'gt-next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getUpdateVendorSchema } from './schema';

export const updateVendorAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getUpdateVendorSchema(t);
  })
  .metadata({
    name: 'update-vendor',
    track: {
      event: 'update-vendor',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, name, description, category, assigneeId, status } = parsedInput;
    const { session } = ctx;
    const t = await getGT();

    if (!session.activeOrganizationId) {
      throw new Error(t('Invalid user input'));
    }

    try {
      await db.vendor.update({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
        data: {
          name,
          description,
          assigneeId,
          category,
          status,
        },
      });

      revalidatePath(`/${session.activeOrganizationId}/vendors`);
      revalidatePath(`/${session.activeOrganizationId}/vendors/register`);
      revalidatePath(`/${session.activeOrganizationId}/vendors/${id}`);
      revalidateTag('vendors');

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating vendor:', error);

      return {
        success: false,
      };
    }
  });
