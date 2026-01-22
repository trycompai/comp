'use server';

import { createTrainingVideoEntries } from '@/lib/db/employee';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authActionClientWithoutOrg } from '../safe-action';
import type { ActionResponse } from '../types';

async function validateInviteCode(inviteCode: string, invitedEmail: string) {
  const pendingInvitation = await db.invitation.findFirst({
    where: {
      status: 'pending',
      email: invitedEmail,
      id: inviteCode,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return pendingInvitation;
}

const completeInvitationSchema = z.object({
  inviteCode: z.string(),
});

export const completeInvitation = authActionClientWithoutOrg
  .metadata({
    name: 'complete-invitation',
    track: {
      event: 'complete_invitation',
      channel: 'organization',
    },
  })
  .inputSchema(completeInvitationSchema)
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<
      ActionResponse<{
        accepted: boolean;
        organizationId: string;
      }>
    > => {
      const { inviteCode } = parsedInput;
      const user = ctx.user;

      if (!user || !user.email) {
        throw new Error('Unauthorized');
      }

      try {
        const invitation = await validateInviteCode(inviteCode, user.email);

        if (!invitation) {
          throw new Error('Invitation either used or expired');
        }

        const existingMembership = await db.member.findFirst({
          where: {
            userId: user.id,
            organizationId: invitation.organizationId,
          },
        });

        if (existingMembership) {
          if (ctx.session.activeOrganizationId !== invitation.organizationId) {
            await db.session.update({
              where: { id: ctx.session.id },
              data: {
                activeOrganizationId: invitation.organizationId,
              },
            });
          }

          await db.invitation.update({
            where: { id: invitation.id },
            data: {
              status: 'accepted',
            },
          });

          if (existingMembership.deactivated) {
            await db.member.update({
              where: { id: existingMembership.id },
              data: {
                deactivated: false,
                role: invitation.role,
              },
            });
          }

          // Server redirect to the organization's root
          redirect(`/${invitation.organizationId}/`);
        }

        if (!invitation.role) {
          throw new Error('Invitation role is required');
        }

        const newMember = await db.member.create({
          data: {
            userId: user.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
            department: 'none',
          },
        });

        // Create training video completion entries for the new member
        await createTrainingVideoEntries(newMember.id);

        await db.invitation.update({
          where: {
            id: invitation.id,
          },
          data: {
            status: 'accepted',
          },
        });

        await db.session.update({
          where: {
            id: ctx.session.id,
          },
          data: {
            activeOrganizationId: invitation.organizationId,
          },
        });

        revalidatePath(`/${invitation.organization.id}`);
        revalidatePath(`/${invitation.organization.id}/settings/users`);
        revalidateTag(`user_${user.id}`, 'max');

        // Server redirect to the organization's root
        redirect(`/${invitation.organizationId}/`);
      } catch (error) {
        console.error('Error accepting invitation:', error);
        throw new Error(error as string);
      }
    },
  );
