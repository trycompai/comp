import { isBuiltInRole, parseRolesString } from '@/lib/permissions';
import { Member, User } from '@db';

interface FilterMembersByOwnerOrAdminParams {
  members: (Member & { user: User })[];
  /**
   * Optional current assignee ID to always include (even if not assignable),
   * so existing assignments/active filters remain visible.
   */
  currentAssigneeId?: string | null;
}

/**
 * Filters members to those eligible to be task assignees.
 *
 * Roles are stored as comma-separated strings (e.g., "owner,admin" or "SecDev").
 * A member is eligible when any of their roles is `owner`/`admin` OR a custom
 * (non-built-in) role such as "SecDev". Custom roles are org-defined and the
 * backend accepts them as assignees, so they must be selectable here too.
 * The built-in restricted roles (`employee`, `contractor`) and `auditor` remain
 * excluded.
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

    // Roles can be comma-separated, so include the member if any single role qualifies.
    const roles = parseRolesString(member.role);
    return roles.some((role) => {
      const normalized = role.toLowerCase();
      if (normalized === 'owner' || normalized === 'admin') return true;
      // Custom roles (anything not built in) are valid assignees.
      return !isBuiltInRole(role);
    });
  });
}
