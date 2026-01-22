'use server';

import { authClient } from '@/utils/auth-client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';
import type { ActionResponse } from '../types';

// Schema only needs email now
const inviteEmployeeSchema = z.object({
  email: z.string().email(),
});

export const inviteEmployee = authActionClient
  .metadata({
    name: 'invite-employee', // Updated name
    track: {
      event: 'invite_employee', // Updated event name
      channel: 'organization',
    },
  })
  .inputSchema(inviteEmployeeSchema)
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse<{ invited: boolean }>> => {
    const organizationId = ctx.session.activeOrganizationId;

    if (!organizationId) {
      return {
        success: false,
        error: 'Organization not found',
      };
    }

    const { email } = parsedInput; // Role is removed from input

    try {
      await authClient.organization.inviteMember({
        email,
        role: 'employee', // Hardcoded role
      });

      // Revalidate the employees list page
      revalidatePath(`/${organizationId}/people/all`);
      revalidateTag(`user_${ctx.user.id}`, 'max'); // Keep user tag revalidation

      return {
        success: true,
        data: { invited: true },
      };
    } catch (error) {
      console.error('Error inviting employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite employee';
      return {
        success: false,
        error: errorMessage,
      };
    }
  });
