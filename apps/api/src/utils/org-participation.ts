import { db, Prisma } from '@db';
// Import from the dedicated subpath (not the package index) so this stays free
// of better-auth — keeps the util light and Jest-loadable without ESM interop.
import {
  PLATFORM_ADMIN_ROLE,
  isOrgParticipant,
} from '@trycompai/auth/participation';

/**
 * Resolve whether an organization is platform-operated ("internal", e.g. Comp
 * AI's own org). Internal orgs treat platform admins as real participants.
 */
export async function getOrgIsInternal(
  organizationId: string,
): Promise<boolean> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { isInternal: true },
  });
  return org?.isInternal ?? false;
}

/**
 * Whether a member with the given global `User.role` may participate in the org
 * (be an assignee/approver, count toward compliance, receive notifications).
 * Fetches the org's internal flag, then delegates to the shared predicate.
 */
export async function isMemberOrgParticipant(
  userRole: string | null | undefined,
  organizationId: string,
): Promise<boolean> {
  return isOrgParticipant(userRole, {
    orgIsInternal: await getOrgIsInternal(organizationId),
  });
}

/**
 * A Prisma `Member` where-fragment that keeps only org participants — the SQL
 * translation of {@link isOrgParticipant}. Spread it into a member query's
 * `where`. Returns an empty fragment for internal orgs (everyone participates).
 * For other orgs it excludes only platform admins; `role: { not }` skips NULL in
 * SQL, so null roles are included explicitly to match the predicate (a null
 * global role is a normal member, not a platform admin). Use for
 * recipient/participant lists (notifications, mentions, devices).
 */
export async function orgParticipantMemberWhere(
  organizationId: string,
): Promise<Prisma.MemberWhereInput> {
  if (await getOrgIsInternal(organizationId)) return {};
  return {
    user: { OR: [{ role: { not: PLATFORM_ADMIN_ROLE } }, { role: null }] },
  };
}
