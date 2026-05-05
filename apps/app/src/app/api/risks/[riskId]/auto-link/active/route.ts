import { requireApiPermission } from '@/lib/permissions.server';
import { db } from '@db/server';
import { auth as triggerAuth } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Decide whether a `createPublicToken` failure is the "run was purged"
 * terminal case (drop the stored runId — the run is permanently gone) or
 * something transient (a network blip, rate limit, auth issue) where we
 * should keep the runId so the next attempt can recover.
 *
 * Trigger.dev surfaces purged/missing runs as 404 with a "not found" body.
 * Anything else — including unauthorized, timeouts, 5xx — gets treated as
 * transient and bubbles up as a 502 from the route. See Cubic finding
 * #4/#5 on PR #2671.
 */
function isRunGoneError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { status?: number; statusCode?: number; message?: string };
  const status = e.status ?? e.statusCode;
  if (status === 404) return true;
  const msg = (e.message ?? String(err)).toLowerCase();
  return msg.includes('not found') || msg.includes('purged');
}

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
    const ctx = await requireApiPermission(req, 'risk', 'read');
    if (ctx instanceof NextResponse) return ctx;
    const { organizationId } = ctx;

    const { riskId } = await params;

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
      if (isRunGoneError(err)) {
        // Run was purged by trigger.dev (retention TTL or never existed).
        // Drop the stale id so the next /auto-link call starts cleanly.
        console.warn('[auto-link/active] run gone, clearing stored runId', err);
        await db.risk.update({
          where: { id: riskId },
          data: { autoLinkRunId: null, autoLinkRunStartedAt: null },
        });
        return NextResponse.json({ runId: null });
      }
      // Transient failure (network, 5xx, rate limit). Keep the runId so a
      // retry can recover; the UI treats 502 as "try again later".
      console.error('[auto-link/active] transient token mint failure', err);
      return NextResponse.json(
        { error: 'Failed to mint access token; try again' },
        { status: 502 },
      );
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
    const ctx = await requireApiPermission(req, 'risk', 'update');
    if (ctx instanceof NextResponse) return ctx;
    const { organizationId } = ctx;

    const { riskId } = await params;

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
