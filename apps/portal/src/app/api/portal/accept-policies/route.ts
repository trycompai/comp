import { auth } from '@/app/lib/auth';
import { acknowledgePortalPolicies } from '@/lib/acknowledge-portal-policies';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  organizationId: z.string().min(1),
  policyIds: z.array(z.string().min(1)).min(1).max(1000),
  memberId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await acknowledgePortalPolicies({ userId: session.user.id, ...parsed.data });
    if (!result.success) {
      return NextResponse.json({ error: 'Policy access denied' }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to accept policies' }, { status: 500 });
  }
}
