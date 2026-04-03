import { auth } from '@/app/lib/auth';
import { db } from '@db/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  policyId: z.string().min(1),
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

  const { policyId } = parsed.data;

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      deactivated: false,
    },
  });

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const policy = await db.policy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  // Check if user has already signed this policy
  if (policy.signedBy.includes(member.id)) {
    return NextResponse.json({ success: true, alreadySigned: true });
  }

  await db.policy.update({
    where: { id: policyId },
    data: {
      signedBy: [...policy.signedBy, member.id],
    },
  });

  return NextResponse.json({ success: true });
}
