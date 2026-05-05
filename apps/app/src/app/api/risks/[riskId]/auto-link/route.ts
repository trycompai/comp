import { requireApiPermission } from '@/lib/permissions.server';
import type { linkRisksAndVendorsToWork } from '@/trigger/tasks/onboarding/link-risks-and-vendors-to-work';
import { db } from '@db/server';
import { auth as triggerAuth, tasks } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/risks/[riskId]/auto-link
 *
 * Triggers the linkage task in `suggestionsOnly` mode for one risk and returns
 * a public-access token so the frontend can subscribe via `useRealtimeRun`,
 * display live progress, and read `run.output.suggestions` once complete.
 *
 * No DB writes happen here — the user reviews the suggestions in the UI and
 * the apply endpoint (`/auto-link/apply`) persists their final selection.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ riskId: string }> },
) {
  try {
    const ctx = await requireApiPermission(req, 'risk', 'update');
    if (ctx instanceof NextResponse) return ctx;
    const { organizationId } = ctx;

    const { riskId } = await params;
    if (!riskId) {
      return NextResponse.json(
        { error: 'Risk ID is required' },
        { status: 400 },
      );
    }

    const risk = await db.risk.findUnique({
      where: { id: riskId },
      select: { id: true, organizationId: true },
    });

    if (!risk || risk.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const handle = await tasks.trigger<typeof linkRisksAndVendorsToWork>(
      'link-risks-and-vendors-to-work',
      { organizationId, riskId, suggestionsOnly: true },
    );

    // Persist the runId so the UI can resume an in-flight scan after a page
    // reload. Cleared by /apply or /discard once the user reviews the result.
    await db.risk.update({
      where: { id: riskId },
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
    console.error('Error triggering risk auto-link:', error);
    return NextResponse.json({ error: 'Failed to trigger auto-link' }, { status: 500 });
  }
}
