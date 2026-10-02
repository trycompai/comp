import { serverApi } from '@/lib/api-server';
import { runs } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeRun, taskStatusAccessSchema } from './access';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    // The API checks the live membership and resolves its effective permissions.
    // A session's activeOrganizationId alone does not grant access to run data.
    const response = await serverApi.get('/v1/auth/task-status-access');
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: response.status });
    }
    const access = taskStatusAccessSchema.safeParse(response.data);
    if (response.error || response.status !== 200 || !access.success) {
      return NextResponse.json({ error: 'Unable to verify access' }, { status: 503 });
    }

    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const run = authorizeRun({ rawRun: await runs.retrieve(taskId), access: access.data });
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: run.status,
      output: run.output,
      error: run.error ? 'Task failed' : undefined,
    });
  } catch (error) {
    console.error('Error retrieving run status:', error);
    if (
      error instanceof Error &&
      (error.message.includes('not found') || error.message.includes('404'))
    ) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to retrieve run status' }, { status: 500 });
  }
}
