import { requireApiPermission } from '@/lib/permissions.server';
import { db } from '@db/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ApplyBodySchema = z.object({
  taskIds: z.array(z.string()).max(100),
  replace: z.boolean().optional().default(false),
});

/**
 * POST /api/vendors/[vendorId]/auto-link/apply
 *
 * Persists the user-confirmed task selection from the AI-suggestion review UI.
 *
 * - `replace: true` → re-assess flow (sync semantics: connect-only-these tasks).
 * - `replace: false` → fresh suggest flow (additive).
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
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }

    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, organizationId: true },
    });
    if (!vendor || vendor.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = ApplyBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { taskIds, replace } = parsed.data;

    // Validate tenancy of every taskId — see risks/auto-link/apply/route.ts
    // for the same rationale (Prisma `connect`/`set` doesn't enforce it).
    if (taskIds.length > 0) {
      const ownedTasks = await db.task.findMany({
        where: { id: { in: taskIds }, organizationId },
        select: { id: true },
      });
      if (ownedTasks.length !== taskIds.length) {
        return NextResponse.json(
          { error: 'One or more tasks do not belong to this organization' },
          { status: 400 },
        );
      }
    }

    if (replace) {
      await db.vendor.update({
        where: { id: vendorId },
        data: {
          tasks: { set: taskIds.map((id) => ({ id })) },
          autoLinkRunId: null,
          autoLinkRunStartedAt: null,
        },
      });
    } else {
      await db.vendor.update({
        where: { id: vendorId },
        data: {
          ...(taskIds.length > 0
            ? { tasks: { connect: taskIds.map((id) => ({ id })) } }
            : {}),
          autoLinkRunId: null,
          autoLinkRunStartedAt: null,
        },
      });
    }

    return NextResponse.json({ linked: taskIds.length });
  } catch (error) {
    console.error('Error applying vendor auto-link:', error);
    return NextResponse.json({ error: 'Failed to apply auto-link' }, { status: 500 });
  }
}
