'use server';

import { authActionClient } from '@/actions/safe-action';
import type { ActionResponse } from '@/actions/types';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const deleteVendorSchema = z.object({
  vendorId: z.string(),
});

export const deleteVendor = authActionClient
  .metadata({
    name: 'delete-vendor',
    track: {
      event: 'delete_vendor',
      channel: 'organization',
    },
  })
  .inputSchema(deleteVendorSchema)
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse<{ deleted: boolean }>> => {
    if (!ctx.session.activeOrganizationId) {
      return {
        success: false,
        error: 'User does not have an active organization',
      };
    }

    const { vendorId } = parsedInput;

    try {
      const currentUserMember = await db.member.findFirst({
        where: {
          organizationId: ctx.session.activeOrganizationId,
          userId: ctx.user.id,
          deactivated: false,
        },
      });

      if (
        !currentUserMember ||
        (!currentUserMember.role.includes('admin') && !currentUserMember.role.includes('owner'))
      ) {
        return {
          success: false,
          error: "You don't have permission to delete vendors.",
        };
      }

      // Verify the vendor exists within the user's organization
      const targetVendor = await db.vendor.findFirst({
        where: {
          id: vendorId,
          organizationId: ctx.session.activeOrganizationId,
        },
      });

      if (!targetVendor) {
        return {
          success: false,
          error: 'Vendor not found in this organization.',
        };
      }

      await db.vendor.delete({
        where: {
          id: vendorId,
        },
      });

      // Revalidate the path to refresh the data on the vendors page
      revalidatePath(`/${ctx.session.activeOrganizationId}/vendors`);

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      console.error('Error deleting vendor:', error);
      return {
        success: false,
        error: 'Failed to delete the vendor. Please try again.',
      };
    }
  });
