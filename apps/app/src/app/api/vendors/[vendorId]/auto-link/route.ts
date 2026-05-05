import { requireApiPermission } from '@/lib/permissions.server';
import type { linkRisksAndVendorsToWork } from '@/trigger/tasks/onboarding/link-risks-and-vendors-to-work';
import { db } from '@db/server';
import { auth as triggerAuth, tasks } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vendors/[vendorId]/auto-link
 *
 * Triggers the linkage task in `suggestionsOnly` mode for one vendor and
 * returns a public-access token so the frontend can subscribe via
 * `useRealtimeRun` and read `run.output.suggestions` once complete.
 *
 * No DB writes happen here — the user reviews the suggestions in the UI and
 * the apply endpoint (`/auto-link/apply`) persists their final selection.
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
      { organizationId, vendorId, suggestionsOnly: true },
    );

    // Persist the runId so the UI can resume an in-flight scan after a page
    // reload. Cleared by /apply or /discard once the user reviews the result.
    await db.vendor.update({
      where: { id: vendorId },
      data: {
        autoLinkRunId: handle.id,
        autoLinkRunStartedAt: new Date(),
      },
    });

    const publicAccessToken = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [handle.id] } },
      expirationTime: '15m',
    });

    return NextResponse.json({ runId: handle.id, publicAccessToken });
  } catch (error) {
    console.error('Error triggering vendor auto-link:', error);
    return NextResponse.json({ error: 'Failed to trigger auto-link' }, { status: 500 });
  }
}
