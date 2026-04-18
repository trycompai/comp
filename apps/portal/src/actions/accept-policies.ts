'use server';

import { Prisma, db } from '@db/server';

async function loadMemberForAck(
  tx: Prisma.TransactionClient,
  memberId: string,
): Promise<{ id: string; name: string | null; email: string } | null> {
  const member = await tx.member.findUnique({
    where: { id: memberId },
    select: { id: true, user: { select: { name: true, email: true } } },
  });
  if (!member) return null;
  return { id: member.id, name: member.user.name ?? null, email: member.user.email };
}

export async function acceptPolicy(policyId: string, memberId: string) {
  try {
    const result = await db.$transaction(async (tx) => {
      const policy = await tx.policy.findUnique({
        where: { id: policyId },
        select: {
          id: true,
          currentVersionId: true,
          organizationId: true,
          signedBy: true,
        },
      });
      if (!policy) throw new Error('Policy not found');
      if (!policy.currentVersionId) throw new Error('Policy has no current version');

      const member = await loadMemberForAck(tx, memberId);
      if (!member) throw new Error('Member not found');

      await tx.policyAcknowledgment.upsert({
        where: {
          policyVersionId_memberId: {
            policyVersionId: policy.currentVersionId,
            memberId: member.id,
          },
        },
        create: {
          policyVersionId: policy.currentVersionId,
          memberId: member.id,
          memberName: member.name,
          memberEmail: member.email,
          organizationId: policy.organizationId,
        },
        update: {},
      });

      if (!policy.signedBy.includes(member.id)) {
        await tx.policy.update({
          where: { id: policyId },
          data: { signedBy: { push: member.id } },
        });
      }

      return { success: true as const };
    });

    return result;
  } catch (error) {
    console.error('Error accepting policy:', error);
    return { success: false as const, error: 'Failed to accept policy' };
  }
}

export async function acceptAllPolicies(policyIds: string[], memberId: string) {
  try {
    await db.$transaction(async (tx) => {
      const member = await loadMemberForAck(tx, memberId);
      if (!member) throw new Error('Member not found');

      for (const policyId of policyIds) {
        const policy = await tx.policy.findUnique({
          where: { id: policyId },
          select: {
            id: true,
            currentVersionId: true,
            organizationId: true,
            signedBy: true,
          },
        });
        if (!policy || !policy.currentVersionId) continue;

        await tx.policyAcknowledgment.upsert({
          where: {
            policyVersionId_memberId: {
              policyVersionId: policy.currentVersionId,
              memberId: member.id,
            },
          },
          create: {
            policyVersionId: policy.currentVersionId,
            memberId: member.id,
            memberName: member.name,
            memberEmail: member.email,
            organizationId: policy.organizationId,
          },
          update: {},
        });

        if (!policy.signedBy.includes(member.id)) {
          await tx.policy.update({
            where: { id: policyId },
            data: { signedBy: { push: member.id } },
          });
        }
      }
    });

    return { success: true as const };
  } catch (error) {
    console.error('Error accepting all policies:', error);
    return { success: false as const, error: 'Failed to accept all policies' };
  }
}
