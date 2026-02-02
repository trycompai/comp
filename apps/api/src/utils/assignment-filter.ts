import { Prisma } from '@prisma/client';

/**
 * Roles that require assignment-based filtering for resources
 */
const RESTRICTED_ROLES = ['employee', 'contractor'];

/**
 * Roles that have full access without assignment filtering
 */
const PRIVILEGED_ROLES = ['owner', 'admin', 'auditor'];

/**
 * Check if user roles are restricted (employee/contractor only)
 * Users with any privileged role are NOT restricted, even if they also have a restricted role
 */
export function isRestrictedRole(roles: string[] | null | undefined): boolean {
  if (!roles || roles.length === 0) {
    return true; // No roles = restricted (fail-safe)
  }

  // If user has any privileged role, they're not restricted
  const hasPrivilegedRole = roles.some((role) =>
    PRIVILEGED_ROLES.includes(role),
  );
  if (hasPrivilegedRole) {
    return false;
  }

  // Check if all roles are restricted
  return roles.every((role) => RESTRICTED_ROLES.includes(role));
}

/**
 * Build Prisma where filter for tasks based on assignment
 * For restricted roles, only show tasks assigned to the member
 */
export function buildTaskAssignmentFilter(
  memberId: string | null | undefined,
  roles: string[] | null | undefined,
): Prisma.TaskWhereInput {
  if (!isRestrictedRole(roles)) {
    return {}; // No filtering for privileged roles
  }

  if (!memberId) {
    // Restricted user with no memberId - return filter that matches nothing
    return { id: 'impossible_match_no_member' };
  }

  return { assigneeId: memberId };
}

/**
 * Build Prisma where filter for risks based on assignment
 * For restricted roles, only show risks assigned to the member
 */
export function buildRiskAssignmentFilter(
  memberId: string | null | undefined,
  roles: string[] | null | undefined,
): Prisma.RiskWhereInput {
  if (!isRestrictedRole(roles)) {
    return {}; // No filtering for privileged roles
  }

  if (!memberId) {
    return { id: 'impossible_match_no_member' };
  }

  return { assigneeId: memberId };
}

/**
 * Build Prisma where filter for controls based on task assignment
 * For restricted roles, only show controls linked to tasks assigned to the member
 */
export function buildControlAssignmentFilter(
  memberId: string | null | undefined,
  roles: string[] | null | undefined,
): Prisma.ControlWhereInput {
  if (!isRestrictedRole(roles)) {
    return {}; // No filtering for privileged roles
  }

  if (!memberId) {
    return { id: 'impossible_match_no_member' };
  }

  // Controls visible if any linked task is assigned to member
  return {
    tasks: {
      some: { assigneeId: memberId },
    },
  };
}

/**
 * Build Prisma where filter for policies based on assignment
 * For restricted roles, only show policies where the member is the assignee
 */
export function buildPolicyAssignmentFilter(
  memberId: string | null | undefined,
  roles: string[] | null | undefined,
): Prisma.PolicyWhereInput {
  if (!isRestrictedRole(roles)) {
    return {}; // No filtering for privileged roles
  }

  if (!memberId) {
    return { id: 'impossible_match_no_member' };
  }

  // Policies visible if member is the assignee
  return {
    assigneeId: memberId,
  };
}

/**
 * Check if a member has access to a specific task
 */
export function hasTaskAccess(
  task: { assigneeId: string | null },
  memberId: string | null | undefined,
  roles: string[] | null | undefined,
): boolean {
  if (!isRestrictedRole(roles)) {
    return true; // Privileged roles have access to all tasks
  }

  if (!memberId) {
    return false;
  }

  return task.assigneeId === memberId;
}

/**
 * Check if a member has access to a specific risk
 */
export function hasRiskAccess(
  risk: { assigneeId: string | null },
  memberId: string | null | undefined,
  roles: string[] | null | undefined,
): boolean {
  if (!isRestrictedRole(roles)) {
    return true; // Privileged roles have access to all risks
  }

  if (!memberId) {
    return false;
  }

  return risk.assigneeId === memberId;
}

/**
 * Check if a member has access to a control (via assigned tasks)
 */
export function hasControlAccess(
  control: { tasks: { assigneeId: string | null }[] },
  memberId: string | null | undefined,
  roles: string[] | null | undefined,
): boolean {
  if (!isRestrictedRole(roles)) {
    return true; // Privileged roles have access to all controls
  }

  if (!memberId) {
    return false;
  }

  // Control accessible if ANY linked task is assigned to the member
  return control.tasks.some((task) => task.assigneeId === memberId);
}
