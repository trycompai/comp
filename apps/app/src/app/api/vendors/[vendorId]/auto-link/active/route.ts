import { requireApiPermission } from '@/lib/permissions.server';
import { db } from '@db/server';
import { auth as triggerAuth } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/vendors/[vendorId]/auto-link/active — see Risk counterpart.
 * DELETE clears the active run (Discard).
 */

/**
 * Decide whether a `createPublicToken` failure means the run is permanently
 * gone (drop the runId) or just transient (keep it, surface a 502). See the
 * risk counterpart and Cubic findings #4/#5 on PR #2671.
 */
function isRunGoneError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { status?: number; statusCode?: number; message?: string };
  const status = e.status ?? e.statusCode;
  if (status === 404) return true;
  const msg = (e.message ?? String(err)).toLowerCase();
  return msg.includes('not found') || msg.includes('purged');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  try {
    const ctx = await requireApiPermission(req, 'vendor', 'read');
    if (ctx instanceof NextResponse) return ctx;
    const { organizationId } = ctx;

    const { vendorId } = await params;

    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, organizationId: true, autoLinkRunId: true },
    });
    if (!vendor || vendor.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!vendor.autoLinkRunId) {
      return NextResponse.json({ runId: null });
    }

    try {
      const publicAccessToken = await triggerAuth.createPublicToken({
        scopes: { read: { runs: [vendor.autoLinkRunId] } },
        expirationTime: '15m',
      });
      return NextResponse.json({ runId: vendor.autoLinkRunId, publicAccessToken });
    } catch (err) {
      if (isRunGoneError(err)) {
        console.warn('[auto-link/active] run gone, clearing stored runId', err);
        await db.vendor.update({
          where: { id: vendorId },
          data: { autoLinkRunId: null, autoLinkRunStartedAt: null },
        });
        return NextResponse.json({ runId: null });
      }
      console.error('[auto-link/active] transient token mint failure', err);
      return NextResponse.json(
        { error: 'Failed to mint access token; try again' },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('Error reading active vendor auto-link run:', error);
    return NextResponse.json({ error: 'Failed to read active run' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  try {
    const ctx = await requireApiPermission(req, 'vendor', 'update');
    if (ctx instanceof NextResponse) return ctx;
    const { organizationId } = ctx;

    const { vendorId } = await params;

    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, organizationId: true },
    });
    if (!vendor || vendor.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.vendor.update({
      where: { id: vendorId },
      data: { autoLinkRunId: null, autoLinkRunStartedAt: null },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error discarding vendor auto-link run:', error);
    return NextResponse.json({ error: 'Failed to discard run' }, { status: 500 });
  }
}
