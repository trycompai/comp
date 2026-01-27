'use server';

import { maskEmail } from '@/lib/mask-email';
import { auth } from '@/utils/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
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
    const requestId = crypto.randomUUID();

    if (!organizationId) {
      console.warn('[inviteEmployee] missing organization', { requestId });
      return {
        success: false,
        error: 'Organization not found',
      };
    }

    const { email } = parsedInput; // Role is removed from input
    const safeEmail = maskEmail(email);
    const startTime = Date.now();

    console.info('[inviteEmployee] start', {
      requestId,
      organizationId,
      invitedEmail: safeEmail,
      role: 'employee',
    });

    try {
      const inviteResult = await auth.api.createInvitation({
        headers: await headers(),
        body: {
          email,
          role: 'employee', // Hardcoded role
          organizationId,
        },
      });

      // Revalidate the employees list page
      revalidatePath(`/${organizationId}/people/all`);
      revalidateTag(`user_${ctx.user.id}`, 'max'); // Keep user tag revalidation

      console.info('[inviteEmployee] success', {
        requestId,
        organizationId,
        invitedEmail: safeEmail,
        role: 'employee',
        durationMs: Date.now() - startTime,
        resultKeys: inviteResult && typeof inviteResult === 'object' ? Object.keys(inviteResult) : [],
      });

      return {
        success: true,
        data: { invited: true },
      };
    } catch (error) {
      console.error('[inviteEmployee] failure', {
        requestId,
        organizationId,
        invitedEmail: safeEmail,
        role: 'employee',
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite employee';
      return {
        success: false,
        error: errorMessage,
      };
    }
  });
