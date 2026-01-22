'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
// Adjust safe-action import for colocalized structure
import { authActionClient } from '@/actions/safe-action';
import type { ActionResponse } from '@/actions/types';
import {
  isUserUnsubscribed,
  sendUnassignedItemsNotificationEmail,
  type UnassignedItem,
} from '@comp/email';

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
          error: "You don't have permission to remove members",
        };
      }

      // Check if the target member exists in the organization
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

      // Prevent removing the owner
      if (targetMember.role.includes('owner')) {
        return {
          success: false,
          error: 'Cannot remove the organization owner',
        };
      }

      // Prevent self-removal
      if (targetMember.userId === ctx.user.id) {
        return {
          success: false,
          error: 'You cannot remove yourself from the organization',
        };
      }

      // Get organization name
      const organization = await db.organization.findUnique({
        where: {
          id: ctx.session.activeOrganizationId,
        },
        select: {
          name: true,
        },
      });

      // Check for assignments and collect unassigned items
      const unassignedItems: UnassignedItem[] = [];

      // Check tasks
      const assignedTasks = await db.task.findMany({
        where: {
          assigneeId: memberId,
          organizationId: ctx.session.activeOrganizationId,
        },
        select: {
          id: true,
          title: true,
        },
      });

      for (const task of assignedTasks) {
        unassignedItems.push({
          type: 'task',
          id: task.id,
          name: task.title,
        });
      }

      // Check policies
      const assignedPolicies = await db.policy.findMany({
        where: {
          assigneeId: memberId,
          organizationId: ctx.session.activeOrganizationId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      for (const policy of assignedPolicies) {
        unassignedItems.push({
          type: 'policy',
          id: policy.id,
          name: policy.name,
        });
      }

      // Check risks
      const assignedRisks = await db.risk.findMany({
        where: {
          assigneeId: memberId,
          organizationId: ctx.session.activeOrganizationId,
        },
        select: {
          id: true,
          title: true,
        },
      });

      for (const risk of assignedRisks) {
        unassignedItems.push({
          type: 'risk',
          id: risk.id,
          name: risk.title,
        });
      }

      // Check vendors
      const assignedVendors = await db.vendor.findMany({
        where: {
          assigneeId: memberId,
          organizationId: ctx.session.activeOrganizationId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      for (const vendor of assignedVendors) {
        unassignedItems.push({
          type: 'vendor',
          id: vendor.id,
          name: vendor.name,
        });
      }

      // Clear all assignments
      await Promise.all([
        db.task.updateMany({
          where: {
            assigneeId: memberId,
            organizationId: ctx.session.activeOrganizationId,
          },
          data: {
            assigneeId: null,
          },
        }),
        db.policy.updateMany({
          where: {
            assigneeId: memberId,
            organizationId: ctx.session.activeOrganizationId,
          },
          data: {
            assigneeId: null,
          },
        }),
        db.risk.updateMany({
          where: {
            assigneeId: memberId,
            organizationId: ctx.session.activeOrganizationId,
          },
          data: {
            assigneeId: null,
          },
        }),
        db.vendor.updateMany({
          where: {
            assigneeId: memberId,
            organizationId: ctx.session.activeOrganizationId,
          },
          data: {
            assigneeId: null,
          },
        }),
      ]);

      // Mark the member as deactivated instead of deleting
      await db.member.update({
        where: {
          id: memberId,
        },
        data: {
          deactivated: true,
          isActive: false,
        },
      });

      // Consider if deleting sessions is still desired here
      await db.session.deleteMany({
        where: {
          userId: targetMember.userId,
        },
      });

      // Notify admins if there are unassigned items
      if (unassignedItems.length > 0 && organization) {
        const owner = await db.member.findFirst({
          where: {
            organizationId: ctx.session.activeOrganizationId,
            role: { contains: 'owner' },
            deactivated: false,
          },
          include: {
            user: true,
          },
        });

        const removedMemberName = targetMember.user.name || targetMember.user.email || 'Member';

        if (owner) {
          // Check if owner is unsubscribed from unassigned items notifications
          const unsubscribed = await isUserUnsubscribed(
            db,
            owner.user.email,
            'unassignedItemsNotifications',
          );

          if (!unsubscribed) {
            // Send email to the org owner
            sendUnassignedItemsNotificationEmail({
              email: owner.user.email,
              userName: owner.user.name || owner.user.email || 'Owner',
              organizationName: organization.name,
              organizationId: ctx.session.activeOrganizationId,
              removedMemberName,
              unassignedItems,
            });
          }
        }
      }

      revalidatePath(`/${ctx.session.activeOrganizationId}/settings/users`);
      revalidateTag(`user_${ctx.user.id}`, 'max');

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
