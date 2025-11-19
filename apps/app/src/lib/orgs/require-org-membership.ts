import { db } from '@db';

interface RequireOrgMembershipParams {
  orgId: string;
  userId: string;
}

export async function requireOrgMembership({ orgId, userId }: RequireOrgMembershipParams) {
  const membership = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId,
    },
  });

  if (!membership) {
    throw new Error('Unauthorized');
  }

  const organization = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  return { membership, organization };
}
