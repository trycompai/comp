import {
  BUILT_IN_ROLE_OBLIGATIONS,
  PLATFORM_ADMIN_ROLE,
  type RoleObligations,
  allRoles,
  isOrgParticipant,
} from '@trycompai/auth';
import { db } from '@db';
import { getOrgIsInternal } from './org-participation';

/**
 * Check if any of the given role names have the compliance obligation,
 * considering both built-in and custom role obligations.
 */
function hasComplianceObligation(
  roleNames: string[],
  customObligationMap: Record<string, RoleObligations>,
): boolean {
  for (const name of roleNames) {
    // Check built-in role obligations
    const builtIn = BUILT_IN_ROLE_OBLIGATIONS[name];
    if (builtIn?.compliance) return true;
    // Check custom role obligations
    const custom = customObligationMap[name];
    if (custom?.compliance) return true;
  }
  return false;
}

interface MemberWithRole {
  role: string;
  user?: { role?: string | null } | null;
}

/**
 * Filter members to only those with the compliance obligation.
 * Excludes platform admins — they join customer orgs to debug,
 * not to be counted toward compliance progress.
 * Resolves built-in role obligations in-memory and fetches custom role
 * obligations with a single DB query.
 */
export async function filterComplianceMembers<T extends MemberWithRole>(
  members: T[],
  organizationId: string,
): Promise<T[]> {
  if (members.length === 0) return [];

  // The internal flag only changes a platform admin's participation, so skip the
  // extra query entirely when the list has no platform admins (the common case).
  const hasPlatformAdmin = members.some(
    (m) => m.user?.role === PLATFORM_ADMIN_ROLE,
  );
  const orgIsInternal = hasPlatformAdmin
    ? await getOrgIsInternal(organizationId)
    : false;

  // Collect all custom role names
  const allCustomRoleNames = new Set<string>();
  const builtInRoleNames = new Set<string>(Object.keys(allRoles));
  const memberRoles = members.map((member) => {
    const roleNames = member.role
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    const customNames = roleNames.filter((n) => !builtInRoleNames.has(n));
    for (const name of customNames) allCustomRoleNames.add(name);
    return { member, roleNames };
  });

  // Single DB query for custom role obligations
  let customObligationMap: Record<string, RoleObligations> = {};
  if (allCustomRoleNames.size > 0) {
    const customRoles = await db.organizationRole.findMany({
      where: { organizationId, name: { in: [...allCustomRoleNames] } },
      select: { name: true, obligations: true },
    });
    customObligationMap = Object.fromEntries(
      customRoles.map((r) => {
        const obligations =
          typeof r.obligations === 'string'
            ? JSON.parse(r.obligations)
            : r.obligations || {};
        return [r.name, obligations as RoleObligations];
      }),
    );
  }

  return memberRoles
    .filter(({ member, roleNames }) => {
      // Platform admins are excluded — they join customer orgs to debug — unless
      // this is an internal (platform-operated) org where they are real members.
      if (!isOrgParticipant(member.user?.role, { orgIsInternal })) return false;
      return hasComplianceObligation(roleNames, customObligationMap);
    })
    .map(({ member }) => member);
}
