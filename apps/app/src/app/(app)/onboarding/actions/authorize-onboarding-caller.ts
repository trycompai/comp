import { hasPermission } from '@/lib/permissions';
import { resolveUserPermissions } from '@/lib/permissions.server';
import { db } from '@db/server';

export type OnboardingAuthorization = { ok: true; memberId: string } | { ok: false; error: string };

/**
 * Onboarding rewrites org-wide configuration (context, policies, task
 * assignments), so it needs the org-update permission — not bare membership.
 * Portal-only roles (employee/contractor) and the read-only auditor role must
 * not reach it.
 */
export async function authorizeOnboardingCaller({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}): Promise<OnboardingAuthorization> {
  const member = await db.member.findFirst({
    where: {
      userId,
      organizationId,
      deactivated: false,
      isActive: true,
    },
    select: { id: true, role: true },
  });

  if (!member) {
    return { ok: false, error: 'Access denied' };
  }

  const permissions = await resolveUserPermissions(member.role, organizationId);

  if (!hasPermission(permissions, 'organization', 'update')) {
    return { ok: false, error: 'Access denied' };
  }

  return { ok: true, memberId: member.id };
}
