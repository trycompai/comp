'use server';

import { serverApi } from '@/lib/api-server';
import { db } from '@db';
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
      event: 'remove_employee',
      channel: 'organization',
    },
  })
  .inputSchema(removeEmployeeSchema)
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<ActionResponse<{ removed: boolean; roleUpdated?: boolean }>> => {
      const organizationId = ctx.session.activeOrganizationId;
      const currentUserId = ctx.user!.id;

      if (!organizationId) {
        return {
          success: false,
          error: 'Organization not found',
        };
      }

      const { memberId } = parsedInput;

      try {
        // Fetch target member to determine action
        const targetMember = await db.member.findFirst({
          where: {
            id: memberId,
            organizationId: organizationId,
          },
        });

        if (!targetMember) {
          return {
            success: false,
            error: 'Target employee not found in this organization.',
          };
        }

        const roles = targetMember.role.split(',').filter(Boolean);
        if (!roles.includes('employee') && !roles.includes('contractor')) {
          return {
            success: false,
            error: 'Target member does not have the employee or contractor role.',
          };
        }

        if (roles.length === 1 && (roles[0] === 'employee' || roles[0] === 'contractor')) {
          // Only has employee/contractor role — deactivate via API
          // The API handles session cleanup, assignment clearing, and notifications
          const result = await serverApi.delete(`/v1/people/${memberId}`);

          if (result.error) {
            return {
              success: false,
              error: result.error,
            };
          }

          revalidatePath(`/${organizationId}/people/all`);
          revalidateTag(`user_${currentUserId}`, 'max');

          return { success: true, data: { removed: true } };
        } else {
          // Has other roles — just remove the employee role via API
          const updatedRoles = roles.filter((role) => role !== 'employee').join(',');

          const result = await serverApi.patch(`/v1/people/${memberId}`, {
            role: updatedRoles,
          });

          if (result.error) {
            return {
              success: false,
              error: result.error,
            };
          }

          revalidatePath(`/${organizationId}/people/all`);
          revalidateTag(`user_${currentUserId}`, 'max');

          return {
            success: true,
            data: { removed: false, roleUpdated: true },
          };
        }
      } catch (error) {
        console.error('Error removing employee role/member:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to remove employee role or member.';
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  );
