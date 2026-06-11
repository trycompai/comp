/**
 * Helper types and pure filter function for the policy acknowledgment digest.
 * Extracted from the scheduled task for testability.
 */
import type { PolicyVisibility } from '@db';

// Inlined from @trycompai/auth to avoid pulling that package into the Trigger.dev bundle.
// Keep in sync with packages/auth/src/permissions.ts BUILT_IN_ROLE_OBLIGATIONS.
const BUILT_IN_ROLE_OBLIGATIONS: Record<string, { compliance?: boolean }> = {
  owner: { compliance: true },
  admin: {},
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

  const allRoleNames = new Set<string>();
  const parsed = members.map((member) => {
    const roleNames = member.role
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    for (const name of roleNames) allRoleNames.add(name);
    return { member, roleNames };
  });

  // DB query covers both custom roles AND obligation overrides on built-in
  // roles (rows in organization_role named after a built-in role).
  let obligationMap: Record<string, { compliance?: boolean }> = {};
  if (allRoleNames.size > 0) {
    const dbRoles = await db.organizationRole.findMany({
      where: { organizationId, name: { in: [...allRoleNames] } },
      select: { name: true, obligations: true },
    });
    obligationMap = Object.fromEntries(
      dbRoles.map((r) => {
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
        // DB override wins, but only if `compliance` is explicitly set —
        // otherwise fall back to the hardcoded built-in default.
        const override = obligationMap[name];
        if (override && 'compliance' in override) {
          if (override.compliance) return true;
          continue;
        }
        if (BUILT_IN_ROLE_NAMES.has(name)) {
          const builtIn = BUILT_IN_ROLE_OBLIGATIONS[name];
          if (builtIn?.compliance) return true;
        }
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
  visibleToDepartments: string[];
}

export interface DigestMember {
  id: string;
  role: string;
  department: string | null;
  user: { id: string; name: string | null; email: string; role?: string | null };
}

export function computePendingPolicies(
  member: DigestMember,
  policies: DigestPolicy[],
): DigestPolicy[] {
  return policies.filter((policy) => {
    // signedBy stores member ids (see apps/portal/src/actions/accept-policies.ts),
    // not user ids — every other consumer checks against member.id.
    if (policy.signedBy.includes(member.id)) return false;
    if (policy.visibility === 'ALL') return true;
    if (!member.department) return false;
    return policy.visibleToDepartments.includes(member.department);
  });
}
