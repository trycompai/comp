'use server';

import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '@/actions/safe-action';
import type { ActionResponse } from '@/actions/types';

const reactivateMemberSchema = z.object({
  memberId: z.string(),
});

export const reactivateMember = authActionClient
  .metadata({
    name: 'reactivate-member',
    track: {
      event: 'reactivate_member',
      channel: 'organization',
    },
  })
  .inputSchema(reactivateMemberSchema)
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse<{ reactivated: boolean }>> => {
    if (!ctx.session.activeOrganizationId) {
      return {
        success: false,
        error: 'User does not have an organization',
      };
    }

    const { memberId } = parsedInput;

    try {
      // Check if user has admin permissions
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
          error: "You don't have permission to reactivate members",
        };
      }

      // Check if the target member exists and is deactivated
      const targetMember = await db.member.findFirst({
        where: {
          id: memberId,
          organizationId: ctx.session.activeOrganizationId,
        },
        include: {
          user: true,
        },
      });

      if (!targetMember) {
        return {
          success: false,
          error: 'Member not found in this organization',
        };
      }

      if (!targetMember.deactivated && targetMember.isActive) {
        return {
          success: false,
          error: 'Member is already active',
        };
      }

      // Reactivate the member
      await db.member.update({
        where: {
          id: memberId,
        },
        data: {
          deactivated: false,
          isActive: true,
        },
      });

      revalidatePath(`/${ctx.session.activeOrganizationId}/people`);
      revalidatePath(`/${ctx.session.activeOrganizationId}/people/${memberId}`);

      return {
        success: true,
        data: { reactivated: true },
      };
    } catch (error) {
      console.error('Error reactivating member:', error);
      return {
        success: false,
        error: 'Failed to reactivate member',
      };
    }
  });
