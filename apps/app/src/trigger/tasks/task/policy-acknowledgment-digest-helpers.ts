/**
 * Helper types and pure filter function for the policy acknowledgment digest.
 * Extracted from the scheduled task for testability.
 */
import type { Departments, PolicyVisibility } from '@db';

// Inlined from @trycompai/auth to avoid pulling that package into the Trigger.dev bundle.
// Keep in sync with packages/auth/src/permissions.ts BUILT_IN_ROLE_OBLIGATIONS.
const BUILT_IN_ROLE_OBLIGATIONS: Record<string, { compliance?: boolean }> = {
  owner: { compliance: true },
  admin: { compliance: true },
  auditor: {},
  employee: { compliance: true },
  contractor: { compliance: true },
};
const BUILT_IN_ROLE_NAMES = new Set(Object.keys(BUILT_IN_ROLE_OBLIGATIONS));

export interface ComplianceFilterDb {
  organizationRole: {
    findMany: (args: {
      where: { organizationId: string; name: { in: string[] } };
      select: { name: true; obligations: true };
    }) => Promise<Array<{ name: string; obligations: unknown }>>;
  };
}

/**
 * Filter members to only those with the compliance obligation.
 * Inlined equivalent of apps/app/src/lib/compliance.ts#filterComplianceMembers
 * so this file has no transitive dependency on @trycompai/auth (which cannot
 * be bundled by the Trigger.dev deploy pipeline).
 */
export async function filterDigestMembersByCompliance<T extends DigestMember>(
  db: ComplianceFilterDb,
  members: T[],
  organizationId: string,
): Promise<T[]> {
  if (members.length === 0) return [];

  const customRoleNames = new Set<string>();
  const parsed = members.map((member) => {
    const roleNames = member.role
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    for (const name of roleNames) {
      if (!BUILT_IN_ROLE_NAMES.has(name)) customRoleNames.add(name);
    }
    return { member, roleNames };
  });

  let customObligationMap: Record<string, { compliance?: boolean }> = {};
  if (customRoleNames.size > 0) {
    const customRoles = await db.organizationRole.findMany({
      where: { organizationId, name: { in: [...customRoleNames] } },
      select: { name: true, obligations: true },
    });
    customObligationMap = Object.fromEntries(
      customRoles.map((r) => {
        const obligations =
          typeof r.obligations === 'string'
            ? JSON.parse(r.obligations)
            : r.obligations || {};
        return [r.name, obligations as { compliance?: boolean }];
      }),
    );
  }

  return parsed
    .filter(({ member, roleNames }) => {
      // Platform admins are excluded — matches the @/lib/compliance behavior.
      if (member.user?.role === 'admin') return false;
      for (const name of roleNames) {
        const builtIn = BUILT_IN_ROLE_OBLIGATIONS[name];
        if (builtIn?.compliance) return true;
        const custom = customObligationMap[name];
        if (custom?.compliance) return true;
      }
      return false;
    })
    .map(({ member }) => member);
}

export interface DigestPolicy {
  id: string;
  name: string;
  signedBy: string[];
  visibility: PolicyVisibility;
  visibleToDepartments: Departments[];
}

export interface DigestMember {
  id: string;
  role: string;
  department: Departments | null;
  user: { id: string; name: string | null; email: string; role?: string | null };
}

export function computePendingPolicies(
  member: DigestMember,
  policies: DigestPolicy[],
): DigestPolicy[] {
  return policies.filter((policy) => {
    if (policy.signedBy.includes(member.user.id)) return false;
    if (policy.visibility === 'ALL') return true;
    if (!member.department) return false;
    return policy.visibleToDepartments.includes(member.department);
  });
}
