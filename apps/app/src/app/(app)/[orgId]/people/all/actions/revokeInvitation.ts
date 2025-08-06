'use server';

import { db } from '@db';
// Remove unused Role import if not needed elsewhere
// import { Role } from "@comp/db/types";
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
// Adjust safe-action import for colocalized structure
import { authActionClient } from '@/actions/safe-action';
import type { ActionResponse } from '@/actions/types';
import { getGT } from 'gt-next/server';

const revokeInvitationSchema = z.object({
  invitationId: z.string(),
});

export const revokeInvitation = authActionClient
  .metadata({
    name: 'revoke-invitation',
    track: {
      event: 'revoke_invitation',
      channel: 'organization',
    },
  })
  .inputSchema(revokeInvitationSchema)
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse<{ revoked: boolean }>> => {
    const t = await getGT();
    
    if (!ctx.session.activeOrganizationId) {
      return {
        success: false,
        error: t('User does not have an organization'),
      };
    }

    const { invitationId } = parsedInput;

    try {
      // Check if the invitation exists in the organization
      const invitation = await db.invitation.findFirst({
        where: {
          id: invitationId,
          organizationId: ctx.session.activeOrganizationId,
          status: 'pending',
        },
      });

      if (!invitation) {
        return {
          success: false,
          error: t('Invitation not found or already accepted'),
        };
      }

      // Revoke the invitation by deleting the invitation record
      await db.invitation.delete({
        where: {
          id: invitationId,
        },
      });

      revalidatePath(`/${ctx.session.activeOrganizationId}/settings/users`);
      revalidateTag(`user_${ctx.user.id}`);

      return {
        success: true,
        data: { revoked: true },
      };
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return {
        success: false,
        error: t('Failed to revoke invitation'),
      };
    }
  });
