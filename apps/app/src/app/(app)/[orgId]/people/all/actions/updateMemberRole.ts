'use server';

import { db, Departments, Role } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
// Adjust safe-action import for colocalized structure
import { authActionClient } from '@/actions/safe-action';
import type { ActionResponse } from '@/actions/types';

// Define selectable roles constants here as well for schema consistency
const selectableRoles = ['admin', 'auditor', 'employee'] as const satisfies Readonly<Role[]>;

const updateMemberRoleSchema = z.object({
  memberId: z.string(),
  // Expect an array of roles, ensuring at least one valid role is provided
  roles: z
    .array(z.nativeEnum(Role))
    .min(1, { message: 'At least one role must be selected.' })
    // Ensure owner role cannot be set via this action (should be handled elsewhere)
    .refine((roles) => !roles.includes(Role.owner), {
      message: 'Cannot assign owner role through this action.',
    }),
  department: z.nativeEnum(Departments).optional(),
});

// Helper to safely parse comma-separated roles string
function parseRolesString(rolesStr: string | null | undefined): Role[] {
  if (!rolesStr) return [];
  return rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r in Role) as Role[];
}

// Helper function to compare role arrays
function arraysHaveSameElements(arr1: Role[], arr2: Role[]) {
  if (arr1.length !== arr2.length) return false;
  const sortedArr1 = [...arr1].sort();
  const sortedArr2 = [...arr2].sort();
  return sortedArr1.every((value, index) => value === sortedArr2[index]);
}

export const updateMemberRole = authActionClient
  .metadata({
    name: 'update-member-role',
    track: {
      event: 'update_member_role',
      channel: 'organization',
    },
  })
  .inputSchema(updateMemberRoleSchema)
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse<{ updated: boolean }>> => {
    if (!ctx.session.activeOrganizationId) {
      return {
        success: false,
        error: 'User does not have an organization',
      };
    }

    const { memberId, roles: newRoles, department } = parsedInput;
    const orgId = ctx.session.activeOrganizationId;
    const requestingUserId = ctx.user.id;

    try {
      // Permission check: User needs to be admin or owner
      const currentUserMember = await db.member.findFirst({
        where: { organizationId: orgId, userId: requestingUserId },
      });
      // Check if current user's roles string includes admin or owner
      const currentUserRoles = parseRolesString(currentUserMember?.role);
      const isAdminOrOwner =
        currentUserRoles.includes(Role.admin) || currentUserRoles.includes(Role.owner);

      if (!isAdminOrOwner) {
        return {
          success: false,
          error: "You don't have permission to update member roles",
        };
      }

      // Get target member
      const targetMember = await db.member.findFirst({
        where: { id: memberId, organizationId: orgId },
      });

      if (!targetMember) {
        return {
          success: false,
          error: 'Member not found in this organization',
        };
      }

      // Parse the target member's current roles from the string
      const currentRoles = parseRolesString(targetMember.role);

      // Prevent changing owner's roles
      if (currentRoles.includes(Role.owner)) {
        return {
          success: false,
          error: 'Cannot change roles for the organization owner.',
        };
      }

      // Check if roles or department actually changed
      const rolesChanged = !arraysHaveSameElements(currentRoles, newRoles);
      const departmentChanged = department && targetMember.department !== department;

      if (!rolesChanged && !departmentChanged) {
        return {
          success: true,
          data: { updated: false },
        }; // No changes needed
      }

      // --- Role Update Logic ---
      let newRoleString = targetMember.role; // Start with existing string if only dept changes

      if (rolesChanged) {
        console.log(
          `Updating roles for member ${targetMember.userId} from ${currentRoles.join(',')} to ${newRoles.join(',')}`,
        );

        // ** PREFERRED: Use authClient methods if available **
        // Example: Calculate rolesToAdd/rolesToRemove
        // const rolesToAdd = newRoles.filter(r => !currentRoles.includes(r));
        // const rolesToRemove = currentRoles.filter(r => !newRoles.includes(r));
        // Loop and call authClient.addRole / authClient.removeRole

        // ** FALLBACK: Direct DB Update (Less Ideal) **
        // Construct the new comma-separated string
        newRoleString = newRoles.sort().join(','); // Sort for consistency
      }

      // Prepare data for update
      const updateData: { role?: string; department?: Departments } = {};
      if (rolesChanged) {
        updateData.role = newRoleString ?? ''; // Use new string or empty string if all roles removed
      }
      if (departmentChanged) {
        updateData.department = department;
      }

      // Perform the update if there's data to change
      if (Object.keys(updateData).length > 0) {
        await db.member.update({
          where: { id: memberId },
          data: updateData,
        });
      }

      revalidatePath(`/${orgId}/settings/users`);
      revalidateTag(`user_${requestingUserId}`, 'max');

      return {
        success: true,
        data: { updated: true },
      };
    } catch (error) {
      console.error('Error updating member role(s):', error);
      return {
        success: false,
        error: 'Failed to update member role(s)',
      };
    }
  });
