import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { auth as triggerAuth } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/risks/[riskId]/auto-link/active
 *
 * Resumes an in-flight or completed-but-unreviewed AI suggestion run after a
 * page reload. The runId is persisted on the Risk row by `/auto-link`; this
 * endpoint mints a fresh public-access token (the previous one expires after
 * 15 minutes) so the UI can re-subscribe via `useRealtimeRun`.
 *
 * Returns `{ runId: null }` when no active run exists. Also returns null when
 * the trigger.dev run has been purged (TTL elapsed) — the caller treats both
 * the same: drop the stale runId and start fresh on the next user action.
 *
 * DELETE on the same path discards the active run (user clicked Discard).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ riskId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { riskId } = await params;
    const organizationId = session.session.activeOrganizationId;

    const risk = await db.risk.findUnique({
      where: { id: riskId },
      select: { id: true, organizationId: true, autoLinkRunId: true },
    });
    if (!risk || risk.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!risk.autoLinkRunId) {
      return NextResponse.json({ runId: null });
    }

    try {
      const publicAccessToken = await triggerAuth.createPublicToken({
        scopes: { read: { runs: [risk.autoLinkRunId] } },
        expirationTime: '15m',
      });
      return NextResponse.json({ runId: risk.autoLinkRunId, publicAccessToken });
    } catch (err) {
      // Run was purged by trigger.dev (retention TTL). Clear the stale id so
      // the next /auto-link call starts cleanly.
      console.warn('[auto-link/active] failed to mint token, dropping stale runId', err);
      await db.risk.update({
        where: { id: riskId },
        data: { autoLinkRunId: null, autoLinkRunStartedAt: null },
      });
      return NextResponse.json({ runId: null });
    }
  } catch (error) {
    console.error('Error reading active risk auto-link run:', error);
    return NextResponse.json({ error: 'Failed to read active run' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ riskId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { riskId } = await params;
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
      data: { autoLinkRunId: null, autoLinkRunStartedAt: null },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error discarding risk auto-link run:', error);
    return NextResponse.json({ error: 'Failed to discard run' }, { status: 500 });
  }
}
