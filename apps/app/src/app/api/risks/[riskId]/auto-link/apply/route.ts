import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ApplyBodySchema = z.object({
  taskIds: z.array(z.string()).max(100),
  replace: z.boolean().optional().default(false),
});

/**
 * POST /api/risks/[riskId]/auto-link/apply
 *
 * Persists the user-confirmed task selection from the AI-suggestion review UI.
 *
 * - `replace: true` → re-assess flow (sync semantics: connect-only-these tasks).
 * - `replace: false` → fresh suggest flow (additive: connect these to whatever's
 *   already linked).
 *
 * Mutating endpoints elsewhere in the app go through the NestJS API, but the
 * task↔risk join already lives in this Next.js layer (see `tasks/[taskId]`
 * DELETE), and the AI scan / suggestion plumbing all lives here too. Keeping
 * apply alongside avoids a round trip and stays consistent with the existing
 * unlink endpoint.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ riskId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { riskId } = await params;
    if (!riskId) {
      return NextResponse.json({ error: 'Risk ID is required' }, { status: 400 });
    }

    const organizationId = session.session.activeOrganizationId;

    const risk = await db.risk.findUnique({
      where: { id: riskId },
      select: { id: true, organizationId: true },
    });
    if (!risk || risk.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = ApplyBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { taskIds, replace } = parsed.data;

    if (replace) {
      await db.risk.update({
        where: { id: riskId },
        data: { tasks: { set: taskIds.map((id) => ({ id })) } },
      });
    } else if (taskIds.length > 0) {
      await db.risk.update({
        where: { id: riskId },
        data: { tasks: { connect: taskIds.map((id) => ({ id })) } },
      });
    }

    return NextResponse.json({ linked: taskIds.length });
  } catch (error) {
    console.error('Error applying risk auto-link:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to apply auto-link',
      },
      { status: 500 },
    );
  }
}
