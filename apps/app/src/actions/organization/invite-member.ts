'use server';

import { maskEmailForLogs } from '@/lib/mask-email';
import { auth } from '@/utils/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
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
    const requestId = crypto.randomUUID();

    if (!organizationId) {
      console.warn('[inviteMember] missing organization', { requestId });
      return {
        success: false,
        error: 'Organization not found',
      };
    }

    const { email, role } = parsedInput;
    const safeEmail = maskEmailForLogs(email);
    const startTime = Date.now();

    console.info('[inviteMember] start', {
      requestId,
      organizationId,
      invitedEmail: safeEmail,
      role,
    });

    try {
      const inviteResult = await auth.api.createInvitation({
        headers: await headers(),
        body: {
          email,
          role,
          organizationId,
        },
      });

      revalidatePath(`/${organizationId}/settings/users`);
      revalidateTag(`user_${ctx.user!.id}`, 'max');

      console.info('[inviteMember] success', {
        requestId,
        organizationId,
        invitedEmail: safeEmail,
        role,
        durationMs: Date.now() - startTime,
        resultKeys: inviteResult && typeof inviteResult === 'object' ? Object.keys(inviteResult) : [],
      });

      return {
        success: true,
        data: { invited: true },
      };
    } catch (error) {
      console.error('[inviteMember] failure', {
        requestId,
        organizationId,
        invitedEmail: safeEmail,
        role,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite member';
      return {
        success: false,
        error: errorMessage,
      };
    }
  });
