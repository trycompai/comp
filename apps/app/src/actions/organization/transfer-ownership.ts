'use server';

import { authActionClient } from '@/actions/safe-action';
import type { ActionResponse } from '@/actions/types';
import { db, Role } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1, 'New owner must be selected'),
});

export const transferOwnership = authActionClient
  .metadata({
    name: 'transfer-ownership',
    track: {
      event: 'transfer_ownership',
      channel: 'organization',
    },
  })
  .inputSchema(transferOwnershipSchema)
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse<{ transferred: boolean }>> => {
    if (!ctx.session.activeOrganizationId) {
      return {
        success: false,
        error: 'User does not have an organization',
      };
    }

    const { newOwnerId } = parsedInput;
    const orgId = ctx.session.activeOrganizationId;
    const currentUserId = ctx.user.id;

    try {
      // Get current user's member record
      const currentUserMember = await db.member.findFirst({
        where: { organizationId: orgId, userId: currentUserId },
      });

      if (!currentUserMember) {
        return {
          success: false,
          error: 'Current user is not a member of this organization',
        };
      }

      // Check if current user is the owner
      const currentUserRoles = currentUserMember.role?.split(',').map((r) => r.trim()) ?? [];
      if (!currentUserRoles.includes(Role.owner)) {
        return {
          success: false,
          error: 'Only the organization owner can transfer ownership',
        };
      }

      // Get new owner's member record
      const newOwnerMember = await db.member.findFirst({
        where: {
          id: newOwnerId,
          organizationId: orgId,
          deactivated: false,
        },
      });

      if (!newOwnerMember) {
        return {
          success: false,
          error: 'New owner not found or is deactivated',
        };
      }

      // Prevent transferring to self
      if (newOwnerMember.userId === currentUserId) {
        return {
          success: false,
          error: 'You cannot transfer ownership to yourself',
        };
      }

      // Parse new owner's current roles
      const newOwnerRoles = newOwnerMember.role?.split(',').map((r) => r.trim()) ?? [];

      // Check if new owner already has owner role (shouldn't happen, but safety check)
      if (newOwnerRoles.includes(Role.owner)) {
        return {
          success: false,
          error: 'Selected member is already an owner',
        };
      }

      // Prepare updated roles for current owner:
      // Remove 'owner', add 'admin' if not present, keep all other roles
      const updatedCurrentOwnerRoles = currentUserRoles
        .filter((role) => role !== Role.owner) // Remove owner
        .concat(currentUserRoles.includes(Role.admin) ? [] : [Role.admin]); // Add admin if not present

      // Prepare updated roles for new owner:
      // Add 'owner', keep all existing roles
      const updatedNewOwnerRoles = [...new Set([...newOwnerRoles, Role.owner])]; // Use Set to avoid duplicates

      console.log('[Transfer Ownership] Role updates:', {
        currentOwner: {
          before: currentUserRoles,
          after: updatedCurrentOwnerRoles,
        },
        newOwner: {
          before: newOwnerRoles,
          after: updatedNewOwnerRoles,
        },
      });

      // Update both members in a transaction
      await db.$transaction([
        // Remove owner role from current user and add admin role (keep other roles)
        db.member.update({
          where: { id: currentUserMember.id },
          data: {
            role: updatedCurrentOwnerRoles.sort().join(','),
          },
        }),
        // Add owner role to new owner (keep all existing roles)
        db.member.update({
          where: { id: newOwnerMember.id },
          data: {
            role: updatedNewOwnerRoles.sort().join(','),
          },
        }),
      ]);

      // Revalidate relevant paths
      revalidatePath(`/${orgId}/settings`);
      revalidatePath(`/${orgId}/people/all`);

      return {
        success: true,
        data: { transferred: true },
      };
    } catch (error) {
      console.error('Error transferring ownership:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to transfer ownership';
      return {
        success: false,
        error: errorMessage,
      };
    }
  });

