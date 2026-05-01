import { runLinkage } from '@/lib/embedding/run-linkage';
import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/risks/[riskId]/auto-link
 *
 * Runs the auto-linkage logic synchronously for a single risk, returning the
 * real number of tasks linked so the AutoLinkButton can show an accurate toast
 * and chain into the regenerate-mitigation flow. Latency is bounded (a single
 * embedding query + Prisma update), so we do the work inline instead of
 * dispatching a trigger task.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ riskId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { riskId } = await params;
    if (!riskId) {
      return NextResponse.json(
        { error: 'Risk ID is required' },
        { status: 400 },
      );
    }

    const organizationId = session.session.activeOrganizationId;

    const risk = await db.risk.findUnique({
      where: { id: riskId },
      select: { id: true, organizationId: true },
    });

    if (!risk || risk.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { riskLinks } = await runLinkage({
      organizationId,
      riskId,
    });

    return NextResponse.json({ linked: riskLinks });
  } catch (error) {
    console.error('Error running risk auto-link:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to run auto-link',
      },
      { status: 500 },
    );
  }
}
