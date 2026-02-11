import { runIntegrationTests } from '@/trigger/tasks/integration/run-integration-tests';
import { auth } from '@/utils/auth';
import { runs, tasks } from '@trigger.dev/sdk';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const MAX_POLL_ATTEMPTS = 60; // Max 2 minutes (60 * 2 seconds)
const POLL_INTERVAL_MS = 2000;

/**
 * POST /api/cloud-tests/legacy-scan
 * Triggers a legacy integration test run and waits for completion.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.session?.activeOrganizationId;
  if (!orgId) {
    return NextResponse.json(
      { error: 'No active organization' },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const integrationId = body?.integrationId as string | undefined;

  try {
    const handle = await tasks.trigger<typeof runIntegrationTests>(
      'run-integration-tests',
      {
        organizationId: orgId,
        ...(integrationId ? { integrationId } : {}),
      },
    );

    // Poll for completion
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      const run = await runs.retrieve(handle.id);

      if (run.isCompleted) {
        if (run.isSuccess) {
          const output = run.output as {
            success?: boolean;
            errors?: string[];
          } | null;

          if (output?.success === false) {
            return NextResponse.json({
              success: false,
              errors: output.errors || ['Scan completed with errors'],
              taskId: run.id,
            });
          }

          return NextResponse.json({
            success: true,
            taskId: run.id,
          });
        }

        return NextResponse.json({
          success: false,
          errors:
            run.isFailed || run.isCancelled
              ? ['Task failed or was canceled']
              : ['Task completed with unexpected status'],
          taskId: run.id,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      attempts++;
    }

    // Timeout
    return NextResponse.json({
      success: false,
      errors: [
        'Scan is taking longer than expected. Check the Trigger.dev dashboard.',
      ],
      taskId: handle.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          error instanceof Error
            ? error.message
            : 'Failed to run integration tests',
        ],
      },
      { status: 500 },
    );
  }
}
