import 'server-only';

import { db } from '@db';
import {
  type UserPermissions,
  canAccessApp,
  mergePermissions,
  requiresCompliance,
  resolveBuiltInPermissions,
} from './permissions';

interface MemberWithRole {
  role: string;
}

/**
 * Batch-resolve permissions for a list of members, then filter by a predicate.
 * Resolves built-in role permissions in-memory and fetches custom role
 * permissions with a single DB query.
 */
async function filterMembersByPermission<T extends MemberWithRole>(
  members: T[],
  organizationId: string,
  predicate: (permissions: UserPermissions) => boolean,
): Promise<T[]> {
  if (members.length === 0) return [];

  // Collect all custom role names across all members
  const allCustomRoleNames = new Set<string>();
  const memberResolvedBuiltIn = members.map((member) => {
    const { permissions, customRoleNames } = resolveBuiltInPermissions(member.role);
    for (const name of customRoleNames) allCustomRoleNames.add(name);
    return { member, permissions, customRoleNames };
  });

  // Single DB query for all custom role definitions
  let customRoleMap: Record<string, Record<string, string[]>> = {};
  if (allCustomRoleNames.size > 0) {
    const customRoles = await db.organizationRole.findMany({
      where: {
        organizationId,
        name: { in: [...allCustomRoleNames] },
      },
      select: { name: true, permissions: true },
    });

    customRoleMap = Object.fromEntries(
      customRoles
        .filter((r) => r.permissions)
        .map((r) => {
          const parsed =
            typeof r.permissions === 'string'
              ? JSON.parse(r.permissions)
              : r.permissions;
          return [r.name, parsed as Record<string, string[]>];
        }),
    );
  }

  return memberResolvedBuiltIn
    .filter(({ permissions, customRoleNames }) => {
      const effective: UserPermissions = { ...permissions };
      for (const name of customRoleNames) {
        const customPerms = customRoleMap[name];
        if (customPerms) mergePermissions(effective, customPerms);
      }
      return predicate(effective);
    })
    .map(({ member }) => member);
}

/**
 * Filter members to only those with `compliance:required` permission.
 */
export async function filterComplianceMembers<T extends MemberWithRole>(
  members: T[],
  organizationId: string,
): Promise<T[]> {
  return filterMembersByPermission(members, organizationId, requiresCompliance);
}

/**
 * Filter members to only those with `app:read` permission (main dashboard access).
 */
export async function filterAppAccessMembers<T extends MemberWithRole>(
  members: T[],
  organizationId: string,
): Promise<T[]> {
  return filterMembersByPermission(members, organizationId, canAccessApp);
}
