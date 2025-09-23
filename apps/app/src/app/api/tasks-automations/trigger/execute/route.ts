import { executeAutomationScript } from '@/jobs/tasks/automation/execute-script';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const s3 = new S3Client({ region: 'us-east-1' });

export async function POST(req: Request) {
  try {
    const { orgId, taskId, sandboxId } = await req.json();

    if (!orgId || !taskId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Ensure the script exists in S3 before triggering the task
    try {
      const { Body } = await s3.send(
        new GetObjectCommand({
          Bucket: 'comp-testing-lambda-tasks',
          Key: `${orgId}/${taskId}.automation.js`,
        }),
      );
      await Body!.transformToString();
    } catch (error) {
      console.error('Failed to fetch script from S3:', error);
      return NextResponse.json({ error: 'Script not found in S3' }, { status: 404 });
    }

    // Trigger the automation execution task
    const handle = await executeAutomationScript.trigger({
      orgId,
      taskId,
      sandboxId,
    });

    // In v4, we need to poll for the result or use a different pattern
    // For now, return the run ID and let the client poll for updates
    return NextResponse.json({
      success: true,
      runId: handle.id,
      message: 'Automation task triggered successfully. Poll for updates using the run ID.',
    });
  } catch (error) {
    console.error('Error executing automation script:', error);
    return NextResponse.json(
      { error: 'Failed to execute automation script', details: (error as Error)?.message },
      { status: 500 },
    );
  }
}
