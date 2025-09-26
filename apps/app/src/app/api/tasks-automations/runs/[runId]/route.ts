import { runs } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;

    // Get the run status from Trigger.dev
    const run = await runs.retrieve(runId);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Log the output if the run is completed
    if (run.status === 'COMPLETED' && run.output) {
      console.log(`[Automation Execution] Run ${runId} completed with output:`, run.output);
    } else if (run.status === 'FAILED') {
      console.error(`[Automation Execution] Run ${runId} failed with error:`, run.error);
    }

    // Return the run status and output
    return NextResponse.json({
      id: run.id,
      status: run.status,
      output: run.output,
      error: run.error,
      createdAt: run.createdAt,
      isCompleted: run.isCompleted,
    });
  } catch (error) {
    console.error('Error fetching run status:', error);
    return NextResponse.json({ error: 'Failed to fetch run status' }, { status: 500 });
  }
}
