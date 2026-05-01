import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { auth as triggerAuth } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/vendors/[vendorId]/auto-link/active — see Risk counterpart.
 * DELETE clears the active run (Discard).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId } = await params;
    const organizationId = session.session.activeOrganizationId;

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
      console.warn('[auto-link/active] failed to mint token, dropping stale runId', err);
      await db.vendor.update({
        where: { id: vendorId },
        data: { autoLinkRunId: null, autoLinkRunStartedAt: null },
      });
      return NextResponse.json({ runId: null });
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
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId } = await params;
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
      data: { autoLinkRunId: null, autoLinkRunStartedAt: null },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error discarding vendor auto-link run:', error);
    return NextResponse.json({ error: 'Failed to discard run' }, { status: 500 });
  }
}
