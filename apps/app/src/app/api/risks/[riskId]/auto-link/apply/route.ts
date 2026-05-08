import { requireApiPermission } from '@/lib/permissions.server';
import { db } from '@db/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ApplyBodySchema = z.object({
  taskIds: z.array(z.string()).max(100),
  replace: z.boolean().optional().default(false),
});

/**
 * POST /api/risks/[riskId]/auto-link/apply
 *
 * Persists the user-confirmed task selection from the AI-suggestion review UI.
 *
 * - `replace: true` → re-assess flow (sync semantics: connect-only-these tasks).
 * - `replace: false` → fresh suggest flow (additive: connect these to whatever's
 *   already linked).
 *
 * Mutating endpoints elsewhere in the app go through the NestJS API, but the
 * task↔risk join already lives in this Next.js layer (see `tasks/[taskId]`
 * DELETE), and the AI scan / suggestion plumbing all lives here too. Keeping
 * apply alongside avoids a round trip and stays consistent with the existing
 * unlink endpoint.
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
      return NextResponse.json({ error: 'Risk ID is required' }, { status: 400 });
    }

    const risk = await db.risk.findUnique({
      where: { id: riskId },
      select: { id: true, organizationId: true },
    });
    if (!risk || risk.organizationId !== organizationId) {
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

    // Validate every taskId belongs to the active organization. Without this,
    // a malicious caller could connect another org's tasks to this risk by
    // crafting the request — Prisma's `connect`/`set` doesn't check tenancy.
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
      await db.risk.update({
        where: { id: riskId },
        data: {
          tasks: { set: taskIds.map((id) => ({ id })) },
          autoLinkRunId: null,
          autoLinkRunStartedAt: null,
        },
      });
    } else {
      await db.risk.update({
        where: { id: riskId },
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
    console.error('Error applying risk auto-link:', error);
    return NextResponse.json({ error: 'Failed to apply auto-link' }, { status: 500 });
  }
}
