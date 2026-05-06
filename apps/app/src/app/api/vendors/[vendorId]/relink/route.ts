import { requireApiPermission } from '@/lib/permissions.server';
import type { linkRisksAndVendorsToWork } from '@/trigger/tasks/onboarding/link-risks-and-vendors-to-work';
import { db } from '@db/server';
import { auth as triggerAuth, tasks } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vendors/[vendorId]/relink
 *
 * Wipes ALL current task links on the vendor and rebuilds linkage from the
 * top-K embedding-similar tasks. Destructive — clears user's manual unlinks.
 * Frontend confirms before calling.
 *
 * Returns { runId, publicAccessToken } so the UI can subscribe via useRealtimeRun.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  try {
    const ctx = await requireApiPermission(req, 'vendor', 'update');
    if (ctx instanceof NextResponse) return ctx;
    const { organizationId } = ctx;

    const { vendorId } = await params;
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 },
      );
    }

    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, organizationId: true },
    });

    if (!vendor || vendor.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const handle = await tasks.trigger<typeof linkRisksAndVendorsToWork>(
      'link-risks-and-vendors-to-work',
      { organizationId, vendorId, replace: true },
    );

    const publicAccessToken = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [handle.id] } },
      expirationTime: '15m',
    });

    return NextResponse.json({ runId: handle.id, publicAccessToken });
  } catch (error) {
    console.error('Error triggering vendor relink:', error);
    return NextResponse.json({ error: 'Failed to trigger relink' }, { status: 500 });
  }
}
