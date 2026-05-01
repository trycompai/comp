import { runLinkage } from '@/lib/embedding/run-linkage';
import { auth } from '@/utils/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vendors/[vendorId]/auto-link
 *
 * Runs the auto-linkage logic synchronously for a single vendor, returning the
 * real number of tasks linked so the AutoLinkButton can show an accurate toast.
 * Latency is bounded (a single embedding query + Prisma update), so we do the
 * work inline instead of dispatching a trigger task.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId } = await params;
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 },
      );
    }

    const organizationId = session.session.activeOrganizationId;

    const { vendorLinks } = await runLinkage({
      organizationId,
      vendorId,
    });

    return NextResponse.json({ linked: vendorLinks });
  } catch (error) {
    console.error('Error running vendor auto-link:', error);
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
