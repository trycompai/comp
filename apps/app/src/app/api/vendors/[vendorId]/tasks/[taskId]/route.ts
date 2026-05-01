import { generateVendorMitigation } from '@/trigger/tasks/onboarding/generate-vendor-mitigation';
import type { PolicyContext } from '@/trigger/tasks/onboarding/onboard-organization-helpers';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
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
 * Best-effort fan-out: re-trigger the vendor mitigation generator so the saved
 * treatment plan reflects the now-changed task linkage. We deliberately swallow
 * errors here — the unlink itself already succeeded.
 */
async function refreshVendorTreatmentPlan(
  organizationId: string,
  vendorId: string,
): Promise<void> {
  try {
    const policiesResult = await serverApi.get<PoliciesApiResponse>('/v1/policies');
    const policyRows = policiesResult.data?.data ?? [];
    const policies: PolicyContext[] = policyRows.map((policy) => ({
      name: policy.name,
      description: policy.description,
    }));

    await triggerTasks.trigger<typeof generateVendorMitigation>('generate-vendor-mitigation', {
      organizationId,
      vendorId,
      policies,
    });
  } catch (err) {
    console.warn('Vendor unlink succeeded but plan refresh failed to enqueue', { vendorId, err });
  }
}

/**
 * DELETE /api/vendors/[vendorId]/tasks/[taskId]
 *
 * Soft-removes the link between a vendor and a task by disconnecting the
 * many-to-many join row. The task itself is not deleted. Controls remain
 * derived through the remaining tasks.
 *
 * After a successful unlink, fire-and-forget a re-generation of the
 * treatment plan so the persisted citations reflect the new linkage.
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

    await refreshVendorTreatmentPlan(organizationId, vendorId);

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
