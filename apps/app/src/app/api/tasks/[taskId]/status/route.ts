import { auth } from '@/utils/auth';
import { runs } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

