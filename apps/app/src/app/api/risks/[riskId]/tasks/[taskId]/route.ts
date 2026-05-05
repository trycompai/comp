import { generateRiskMitigation } from '@/trigger/tasks/onboarding/generate-risk-mitigation';
import type { PolicyContext } from '@/trigger/tasks/onboarding/onboard-organization-helpers';
import { serverApi } from '@/lib/api-server';
import { requireApiPermission } from '@/lib/permissions.server';
import { db } from '@db/server';
import { tasks as triggerTasks } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

interface PoliciesApiResponse {
  data: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

/**
 * Best-effort fan-out: re-trigger the risk mitigation generator so the saved
 * treatment plan reflects the now-changed task linkage. We deliberately swallow
 * errors here — the unlink itself already succeeded and refreshing the plan is
 * not load-bearing for the user-facing operation.
 */
async function refreshTreatmentPlan(organizationId: string, riskId: string): Promise<void> {
  try {
    const policiesResult = await serverApi.get<PoliciesApiResponse>('/v1/policies');
    const policyRows = policiesResult.data?.data ?? [];
    const policies: PolicyContext[] = policyRows.map((policy) => ({
      name: policy.name,
      description: policy.description,
    }));

    await triggerTasks.trigger<typeof generateRiskMitigation>('generate-risk-mitigation', {
      organizationId,
      riskId,
      policies,
    });
  } catch (err) {
    console.warn('Unlink succeeded but plan refresh failed to enqueue', { riskId, err });
  }
}

/**
 * DELETE /api/risks/[riskId]/tasks/[taskId]
 *
 * Soft-removes the link between a risk and a task by disconnecting the
 * many-to-many join row. The task itself is not deleted. Controls remain
 * derived through the remaining tasks, so removing the last task that
 * references a given control implicitly removes it from the risk's view.
 *
 * After a successful unlink, fire-and-forget a re-generation of the
 * treatment plan so the persisted citations reflect the new linkage.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ riskId: string; taskId: string }> },
) {
  try {
    const ctx = await requireApiPermission(req, 'risk', 'update');
    if (ctx instanceof NextResponse) return ctx;
    const { organizationId } = ctx;

    const { riskId, taskId } = await params;
    if (!riskId || !taskId) {
      return NextResponse.json(
        { error: 'Risk ID and Task ID are required' },
        { status: 400 },
      );
    }

    // Verify the risk + the link in one query, scoped to the active org.
    // Without this, calling DELETE for a non-linked or wrong-tenant task
    // would let Prisma's `disconnect` no-op or throw a 500 depending on
    // the case — neither is a useful client signal. (Cubic #22.)
    const risk = await db.risk.findUnique({
      where: { id: riskId },
      select: {
        id: true,
        organizationId: true,
        tasks: { where: { id: taskId }, select: { id: true } },
      },
    });
    if (!risk || risk.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (risk.tasks.length === 0) {
      return NextResponse.json(
        { error: 'Task is not linked to this risk' },
        { status: 404 },
      );
    }

    await db.risk.update({
      where: { id: riskId },
      data: { tasks: { disconnect: { id: taskId } } },
    });

    // Fire-and-forget: do NOT await. The unlink itself already succeeded;
    // we don't want the response to wait on (or fail because of) the
    // background plan-refresh trigger. (Cubic #30.)
    void refreshTreatmentPlan(organizationId, riskId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error unlinking task from risk:', error);
    return NextResponse.json({ error: 'Failed to unlink task' }, { status: 500 });
  }
}
