import { auth } from '@/app/lib/auth';
import { db } from '@db';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  policyIds: z.array(z.string()).min(1),
  memberId: z.string().min(1),
});

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
    const updatePromises = policyIds.map(async (policyId) => {
      const policy = await db.policy.findUnique({
        where: { id: policyId },
      });

      if (policy && !policy.signedBy.includes(memberId)) {
        return db.policy.update({
          where: { id: policyId },
          data: {
            signedBy: {
              push: memberId,
            },
          },
        });
      }
      return null;
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to accept policies' }, { status: 500 });
  }
}
