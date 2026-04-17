/**
 * Helper types and pure filter function for the policy acknowledgment digest.
 * Extracted from the scheduled task for testability.
 */
import type { Departments, PolicyVisibility } from '@db';

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
