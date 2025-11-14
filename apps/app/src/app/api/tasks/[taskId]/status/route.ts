import { auth } from '@/utils/auth';
import { answerQuestion } from '@/jobs/tasks/vendors/answer-question';
import { autoAnswerQuestionnaireTask } from '@/jobs/tasks/vendors/auto-answer-questionnaire';
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
    // Try task-specific retrieve methods first, fallback to runs.retrieve
    let run;
    try {
      // Try orchestrator task first
      run = await autoAnswerQuestionnaireTask.retrieve(taskId);
    } catch {
      try {
        // Try individual answer task
        run = await answerQuestion.retrieve(taskId);
      } catch {
        // Fallback to runs.retrieve
        run = await runs.retrieve(taskId);
      }
    }

    if (!run) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: run.status,
      output: run.output,
      error: run.error ? (typeof run.error === 'string' ? run.error : run.error.message || String(run.error)) : undefined,
    });
  } catch (error) {
    console.error('Error retrieving task status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve task status' },
      { status: 500 },
    );
  }
}

