import { auth } from '@/app/lib/auth';
import { Prisma, db } from '@db/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  policyIds: z.array(z.string()).min(1),
  memberId: z.string().min(1),
});

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

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { policyIds, memberId } = parsed.data;

  // Verify the member belongs to the authenticated user
  const member = await db.member.findFirst({
    where: {
      id: memberId,
      userId: session.user.id,
      deactivated: false,
    },
  });

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await db.$transaction(async (tx) => {
      const ackMember = await loadMemberForAck(tx, memberId);
      if (!ackMember) throw new Error('Member not found for ack');

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
              memberId: ackMember.id,
            },
          },
          create: {
            policyVersionId: policy.currentVersionId,
            memberId: ackMember.id,
            memberName: ackMember.name,
            memberEmail: ackMember.email,
            organizationId: policy.organizationId,
          },
          update: {},
        });

        if (!policy.signedBy.includes(ackMember.id)) {
          await tx.policy.update({
            where: { id: policyId },
            data: { signedBy: { push: ackMember.id } },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to accept policies' }, { status: 500 });
  }
}
