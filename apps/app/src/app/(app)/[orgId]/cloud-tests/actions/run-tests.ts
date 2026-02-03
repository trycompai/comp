'use server';

import { runIntegrationTests } from '@/trigger/tasks/integration/run-integration-tests';
import { auth } from '@/utils/auth';
import { runs, tasks } from '@trigger.dev/sdk';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const MAX_POLL_ATTEMPTS = 60; // Max 2 minutes (60 * 2 seconds)
const POLL_INTERVAL_MS = 2000;

/**
 * Run integration tests and wait for completion.
 * @param integrationId - Optional. If provided, only run tests for this specific connection.
 *                        If not provided, run tests for all connections in the organization.
 */
export const runTests = async (integrationId?: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      success: false,
      errors: ['Unauthorized'],
    };
  }

  const orgId = session.session?.activeOrganizationId;
  if (!orgId) {
    return {
      success: false,
      errors: ['No active organization'],
    };
  }

  try {
    // Trigger the task
    const handle = await tasks.trigger<typeof runIntegrationTests>('run-integration-tests', {
      organizationId: orgId,
      ...(integrationId ? { integrationId } : {}),
    });

    // Poll for completion
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      const run = await runs.retrieve(handle.id);

      // Check if the run is in a terminal state
      if (run.isCompleted) {
        const headersList = await headers();
        let path = headersList.get('x-pathname') || headersList.get('referer') || '';
        path = path.replace(/\/[a-z]{2}\//, '/');
        revalidatePath(path);

        if (run.isSuccess) {
          const output = run.output as {
            success?: boolean;
            errors?: string[];
            failedIntegrations?: Array<{ name: string; error: string }>;
          } | null;

          if (output?.success === false) {
            return {
              success: false,
              errors: output.errors || ['Scan completed with errors'],
              taskId: run.id,
            };
          }

          return {
            success: true,
            errors: null,
            taskId: run.id,
          };
        }

        if (run.isFailed || run.isCancelled) {
          return {
            success: false,
            errors: ['Task failed or was canceled'],
            taskId: run.id,
          };
        }
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      attempts++;
    }

    // Timeout - task is taking too long
    return {
      success: false,
      errors: ['Scan is taking longer than expected. Check the status in Trigger.dev dashboard.'],
      taskId: handle.id,
    };
  } catch (error) {
    console.error('Error running integration tests:', error);

    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to run integration tests'],
    };
  }
};
