'use server';

import { authActionClient } from '@/actions/safe-action';
import type { ActionResponse } from '@/actions/types';
import { removeMemberViaApi } from '@/lib/people-api';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const removeMemberSchema = z.object({
  memberId: z.string(),
});

export const removeMember = authActionClient
  .metadata({
    name: 'remove-member',
    track: {
      event: 'remove_member',
      channel: 'organization',
    },
  })
  .inputSchema(removeMemberSchema)
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse<{ removed: boolean }>> => {
    if (!ctx.session.activeOrganizationId) {
      return {
        success: false,
        error: 'User does not have an organization',
      };
    }

    const user = ctx.user;
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    try {
      const response = await removeMemberViaApi({ memberId: parsedInput.memberId });
      if (response.error || !response.data?.success) {
        return {
          success: false,
          error: response.error ?? 'Failed to remove member',
        };
      }

      revalidatePath(`/${ctx.session.activeOrganizationId}/settings/users`);
      revalidateTag(`user_${user.id}`, 'max');

      return {
        success: true,
        data: { removed: true },
      };
    } catch (error) {
      // Log the actual error for better debugging
      console.error('Error removing member:', error);
      return {
        success: false,
        error: 'Failed to remove member', // Keep generic message for client
      };
    }
  });
