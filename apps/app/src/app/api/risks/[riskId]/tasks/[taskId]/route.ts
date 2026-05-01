import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/risks/[riskId]/tasks/[taskId]
 *
 * Soft-removes the link between a risk and a task by disconnecting the
 * many-to-many join row. The task itself is not deleted. Controls remain
 * derived through the remaining tasks, so removing the last task that
 * references a given control implicitly removes it from the risk's view.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ riskId: string; taskId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { riskId, taskId } = await params;
    if (!riskId || !taskId) {
      return NextResponse.json(
        { error: 'Risk ID and Task ID are required' },
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

    await db.risk.update({
      where: { id: riskId },
      data: { tasks: { disconnect: { id: taskId } } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error unlinking task from risk:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to unlink task',
      },
      { status: 500 },
    );
  }
}
