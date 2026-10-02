import { requireApiPermission } from '@/lib/permissions.server';
import { runs } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const ctx = await requireApiPermission(req, 'task', 'read');
    if (ctx instanceof NextResponse) return ctx;

    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Use runs API from Trigger.dev SDK to get run status
    // taskId is actually a run ID (starts with 'run_')
    const run = await runs.retrieve(taskId);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Ownership check: every run we legitimately trigger is tagged with its
    // owning organization's id. A run with no matching tag either belongs to
    // another tenant or was never tagged, so it's not ours to read — return
    // the same 404 as a genuinely missing run to avoid leaking existence.
    if (!run.tags.includes(ctx.organizationId)) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: run.status,
      output: run.output,
      error: run.error
        ? typeof run.error === 'string'
          ? run.error
          : run.error instanceof Error
            ? run.error.message
            : String(run.error)
        : undefined,
    });
  } catch (error) {
    console.error('Error retrieving run status:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      // Check if it's a 404 error from Trigger.dev
      if (error.message.includes('not found') || error.message.includes('404')) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve run status' },
      { status: 500 },
    );
  }
}
