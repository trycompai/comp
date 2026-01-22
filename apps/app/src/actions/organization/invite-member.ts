'use server';

import { authClient } from '@/utils/auth-client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';
import type { ActionResponse } from '../types';

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'auditor', 'employee', 'contractor']),
});

export const inviteMember = authActionClient
  .metadata({
    name: 'invite-member',
    track: {
      event: 'invite_member',
      channel: 'organization',
    },
  })
  .inputSchema(inviteMemberSchema)
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse<{ invited: boolean }>> => {
    const organizationId = ctx.session.activeOrganizationId;

    if (!organizationId) {
      return {
        success: false,
        error: 'Organization not found',
      };
    }

    const { email, role } = parsedInput;

    try {
      await authClient.organization.inviteMember({
        email,
        role,
      });

      revalidatePath(`/${organizationId}/settings/users`);
      revalidateTag(`user_${ctx.user.id}`, 'max');

      return {
        success: true,
        data: { invited: true },
      };
    } catch (error) {
      console.error('Error inviting member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite member';
      return {
        success: false,
        error: errorMessage,
      };
    }
  });
