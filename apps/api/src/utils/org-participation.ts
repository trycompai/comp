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
 * A Prisma `Member` where-fragment that keeps only org participants — i.e.
 * everyone except platform admins, but still including platform admins who are
 * org owners (they opted into this org). Spread it into a member query's
 * `where`. Returns an empty fragment for internal orgs, so platform admins are
 * included there. Use for recipient/participant lists (notifications, devices).
 */
export async function orgParticipantMemberWhere(
  organizationId: string,
): Promise<Prisma.MemberWhereInput> {
  if (await getOrgIsInternal(organizationId)) return {};
  return {
    OR: [
      { user: { role: { not: PLATFORM_ADMIN_ROLE } } },
      { role: { contains: 'owner' } },
    ],
  };
}
