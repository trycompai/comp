import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ApplyBodySchema = z.object({
  taskIds: z.array(z.string()).max(100),
  replace: z.boolean().optional().default(false),
});

/**
 * POST /api/vendors/[vendorId]/auto-link/apply
 *
 * Persists the user-confirmed task selection from the AI-suggestion review UI.
 *
 * - `replace: true` → re-assess flow (sync semantics: connect-only-these tasks).
 * - `replace: false` → fresh suggest flow (additive).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId } = await params;
    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }

    const organizationId = session.session.activeOrganizationId;

    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, organizationId: true },
    });
    if (!vendor || vendor.organizationId !== organizationId) {
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
      await db.vendor.update({
        where: { id: vendorId },
        data: { tasks: { set: taskIds.map((id) => ({ id })) } },
      });
    } else if (taskIds.length > 0) {
      await db.vendor.update({
        where: { id: vendorId },
        data: { tasks: { connect: taskIds.map((id) => ({ id })) } },
      });
    }

    return NextResponse.json({ linked: taskIds.length });
  } catch (error) {
    console.error('Error applying vendor auto-link:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to apply auto-link',
      },
      { status: 500 },
    );
  }
}
