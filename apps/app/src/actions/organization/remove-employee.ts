'use server';

import { db } from '@db';
import { getGT } from 'gt-next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';
import type { ActionResponse } from '../types';

const removeEmployeeSchema = z.object({
  memberId: z.string(),
});

export const removeEmployeeRoleOrMember = authActionClient
  .metadata({
    name: 'remove-employee-role-or-member',
    track: {
      event: 'remove_employee', // Changed event name
      channel: 'organization',
    },
  })
  .inputSchema(removeEmployeeSchema)
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<ActionResponse<{ removed: boolean; roleUpdated?: boolean }>> => {
      const t = await getGT();
      const organizationId = ctx.session.activeOrganizationId;
      const currentUserId = ctx.user.id;

      if (!organizationId) {
        return {
          success: false,
          error: t('Organization not found'),
        };
      }

      const { memberId } = parsedInput;

      try {
        // 1. Permission Check: Ensure current user is admin or owner
        const currentUserMember = await db.member.findFirst({
          where: {
            organizationId: organizationId,
            userId: currentUserId,
          },
        });

        if (!currentUserMember || !['admin', 'owner'].includes(currentUserMember.role)) {
          return {
            success: false,
            error: t('Permission denied: Only admins or owners can remove employees.'),
          };
        }

        // 2. Fetch Target Member
        const targetMember = await db.member.findFirst({
          where: {
            id: memberId,
            organizationId: organizationId,
          },
        });

        if (!targetMember) {
          return {
            success: false,
            error: t('Target employee not found in this organization.'),
          };
        }

        // 3. Check if target has 'employee' role
        const roles = targetMember.role.split(',').filter(Boolean); // Handle empty strings/commas
        if (!roles.includes('employee')) {
          return {
            success: false,
            error: t('Target member does not have the employee role.'),
          };
        }

        // 4. Logic: Remove role or delete member
        if (roles.length === 1 && roles[0] === 'employee') {
          // Only has employee role - delete member fully

          // Cannot remove owner (shouldn't happen if only role is employee, but safety check)
          if (targetMember.role === 'owner') {
            return {
              success: false,
              error: t('Cannot remove the organization owner.'),
            };
          }
          // Cannot remove self
          if (targetMember.userId === currentUserId) {
            return {
              success: false,
              error: t('You cannot remove yourself.'),
            };
          }

          await db.$transaction([
            db.member.delete({ where: { id: memberId } }),
            db.session.deleteMany({
              where: { userId: targetMember.userId },
            }),
          ]);

          // Revalidate
          revalidatePath(`/${organizationId}/people/all`);
          revalidateTag(`user_${currentUserId}`);

          return { success: true, data: { removed: true } };
        } else {
          // Has other roles - just remove 'employee' role
          const updatedRoles = roles.filter((role) => role !== 'employee').join(',');

          await db.member.update({
            where: { id: memberId },
            data: { role: updatedRoles },
          });

          // Revalidate
          revalidatePath(`/${organizationId}/people/all`);
          revalidateTag(`user_${currentUserId}`);

          return {
            success: true,
            data: { removed: false, roleUpdated: true },
          };
        }
      } catch (error) {
        console.error('Error removing employee role/member:', error);
        const errorMessage =
          error instanceof Error ? error.message : t('Failed to remove employee role or member.');
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  );
