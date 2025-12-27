import { db } from '@db';

export async function resolveTaskCreatorAndAssignee(params: {
  organizationId: string;
  createdByUserId?: string | null;
}): Promise<{ creatorMemberId: string; assigneeMemberId: string | null }> {
  const { organizationId, createdByUserId } = params;

  const creatorMember = createdByUserId
    ? await db.member.findFirst({
        where: {
          userId: createdByUserId,
          organizationId,
          deactivated: false,
        },
        select: { id: true },
      })
    : null;

  const adminMember = await db.member.findFirst({
    where: {
      organizationId,
      deactivated: false,
      OR: [{ role: { contains: 'owner' } }, { role: { contains: 'admin' } }],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  const anyMember = await db.member.findFirst({
    where: { organizationId, deactivated: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  const creatorMemberId = creatorMember?.id ?? adminMember?.id ?? anyMember?.id;
  if (!creatorMemberId) {
    throw new Error(`No active members found for organization ${organizationId}`);
  }

  return {
    creatorMemberId,
    assigneeMemberId: creatorMember?.id ?? adminMember?.id ?? null,
  };
}


