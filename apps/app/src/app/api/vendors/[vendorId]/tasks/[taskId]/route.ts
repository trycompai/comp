import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/vendors/[vendorId]/tasks/[taskId]
 *
 * Soft-removes the link between a vendor and a task by disconnecting the
 * many-to-many join row. The task itself is not deleted. Controls remain
 * derived through the remaining tasks.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string; taskId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId, taskId } = await params;
    if (!vendorId || !taskId) {
      return NextResponse.json(
        { error: 'Vendor ID and Task ID are required' },
        { status: 400 },
      );
    }

    const organizationId = session.session.activeOrganizationId;

    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, organizationId: true },
    });

    if (!vendor || vendor.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.vendor.update({
      where: { id: vendorId },
      data: { tasks: { disconnect: { id: taskId } } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error unlinking task from vendor:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to unlink task',
      },
      { status: 500 },
    );
  }
}
