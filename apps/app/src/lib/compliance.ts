import 'server-only';

import { BUILT_IN_ROLE_OBLIGATIONS } from '@trycompai/auth';
import { db } from '@db/server';
import {
  type UserPermissions,
  canAccessApp,
  mergePermissions,
  parseRolesString,
  resolveBuiltInPermissions,
} from './permissions';

interface MemberWithRole {
  role: string;
  user?: { role?: string | null } | null;
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
 * Filter members to only those with the compliance obligation.
 * Checks built-in role obligations and custom role obligations from DB.
 */
export async function filterComplianceMembers<T extends MemberWithRole>(
  members: T[],
  organizationId: string,
): Promise<T[]> {
  if (members.length === 0) return [];

  const builtInRoleNames = new Set(Object.keys(BUILT_IN_ROLE_OBLIGATIONS));
  const allRoleNames = new Set<string>();

  const memberRoles = members.map((member) => {
    const roleNames = parseRolesString(member.role);
    for (const name of roleNames) allRoleNames.add(name);
    return { member, roleNames };
  });

  // Single DB query for role obligations (custom + built-in overrides).
  // A row in organization_role named after a built-in role overrides the
  // hardcoded default for that organization.
  let obligationMap: Record<string, Record<string, boolean>> = {};
  if (allRoleNames.size > 0) {
    const dbRoles = await db.organizationRole.findMany({
      where: { organizationId, name: { in: [...allRoleNames] } },
      select: { name: true, obligations: true },
    });
    obligationMap = Object.fromEntries(
      dbRoles.map((r) => {
        const obligations = typeof r.obligations === 'string'
          ? JSON.parse(r.obligations)
          : (r.obligations || {});
        return [r.name, obligations as Record<string, boolean>];
      }),
    );
  }

  return memberRoles
    .filter(({ member, roleNames }) => {
      // Platform admins are excluded — they join customer orgs to debug
      if (member.user?.role === 'admin') return false;
      for (const name of roleNames) {
        // DB override wins, but only if `compliance` is explicitly set —
        // otherwise fall back to the hardcoded built-in default.
        const override = obligationMap[name];
        if (override && 'compliance' in override) {
          if (override.compliance) return true;
          continue;
        }
        if (builtInRoleNames.has(name)) {
          const builtIn = BUILT_IN_ROLE_OBLIGATIONS[name];
          if (builtIn?.compliance) return true;
        }
      }
      return false;
    })
    .map(({ member }) => member);
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
