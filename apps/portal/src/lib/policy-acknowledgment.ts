import type { Prisma } from '@db/server';

export interface AckMember {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Load the minimal member shape needed for a PolicyAcknowledgment write.
 * Name + email are denormalized onto the ack row so the audit trail survives
 * member deletion.
 */
export async function loadMemberForAck(
  tx: Prisma.TransactionClient,
  memberId: string,
): Promise<AckMember | null> {
  const member = await tx.member.findUnique({
    where: { id: memberId },
    select: { id: true, user: { select: { name: true, email: true } } },
  });
  if (!member) return null;
  return {
    id: member.id,
    name: member.user.name ?? null,
    email: member.user.email,
  };
}
