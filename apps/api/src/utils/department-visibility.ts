import { Departments, Prisma, PolicyVisibility } from '@prisma/client';

/**
 * Roles that have full access without department visibility filtering
 */
const PRIVILEGED_ROLES = ['owner', 'admin', 'program_manager', 'auditor'];

/**
 * Check if user has a privileged role that bypasses visibility filtering
 */
export function isPrivilegedRole(roles: string[] | null | undefined): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }
  return roles.some((role) => PRIVILEGED_ROLES.includes(role));
}

/**
 * Build Prisma where filter for policy visibility based on member's department
 *
 * For privileged roles: No filtering (see all policies)
 * For employees/contractors:
 *   - See policies with visibility = ALL
 *   - See policies where their department is in visibleToDepartments
 */
export function buildPolicyVisibilityFilter(
  memberDepartment: Departments | null | undefined,
  memberRoles: string[] | null | undefined,
): Prisma.PolicyWhereInput {
  // Privileged roles see everything
  if (isPrivilegedRole(memberRoles)) {
    return {};
  }

  // If no department, only show policies visible to ALL
  if (!memberDepartment || memberDepartment === Departments.none) {
    return {
      visibility: PolicyVisibility.ALL,
    };
  }

  // Employees/contractors only see:
  // 1. Policies with visibility = ALL
  // 2. Policies where their department is in visibleToDepartments
  return {
    OR: [
      { visibility: PolicyVisibility.ALL },
      {
        visibility: PolicyVisibility.DEPARTMENT,
        visibleToDepartments: { has: memberDepartment },
      },
    ],
  };
}

/**
 * Check if a member can view a specific policy based on visibility settings
 */
export function canViewPolicy(
  policy: {
    visibility: PolicyVisibility;
    visibleToDepartments: Departments[];
  },
  memberDepartment: Departments | null | undefined,
  memberRoles: string[] | null | undefined,
): boolean {
  // Privileged roles see everything
  if (isPrivilegedRole(memberRoles)) {
    return true;
  }

  // Policy visible to ALL - everyone can see
  if (policy.visibility === PolicyVisibility.ALL) {
    return true;
  }

  // Policy is department-specific
  if (policy.visibility === PolicyVisibility.DEPARTMENT) {
    // No department = can't see department-specific policies
    if (!memberDepartment || memberDepartment === Departments.none) {
      return false;
    }

    // Check if member's department is in the visible list
    return policy.visibleToDepartments.includes(memberDepartment);
  }

  return false;
}
