import { Member, User } from '@db';

interface FilterMembersByOwnerOrAdminParams {
  members: (Member & { user: User })[];
  /**
   * Optional current assignee ID to always include (even if not owner/admin),
   * so existing assignments/active filters remain visible.
   */
  currentAssigneeId?: string | null;
}

/**
 * Filters members to only include those with owner or admin roles
 * Roles are stored as comma-separated strings (e.g., "owner,admin" or "employee")
 */
export function filterMembersByOwnerOrAdmin(
  { members, currentAssigneeId }: FilterMembersByOwnerOrAdminParams,
): (Member & { user: User })[] {
  return members.filter((member) => {
    // Always include current assignee to preserve existing assignments
    if (currentAssigneeId && member.id === currentAssigneeId) {
      return true;
    }
    
    if (!member.role) return false;
    
    // Roles can be comma-separated, so we need to check if any role is owner or admin
    const roles = member.role.split(',').map((r) => r.trim().toLowerCase());
    return roles.includes('owner') || roles.includes('admin');
  });
}
