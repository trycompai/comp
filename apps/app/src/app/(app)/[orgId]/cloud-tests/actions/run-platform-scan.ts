'use server';

import { auth } from '@/utils/auth';
import { runs, tasks } from '@trigger.dev/sdk';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const MAX_POLL_ATTEMPTS = 150; // Max 5 minutes (150 * 2 seconds)
const POLL_INTERVAL_MS = 2000;

/**
 * Run cloud security scan for a new platform connection.
 * Triggers a Trigger.dev background task and polls for completion,
 * avoiding ALB/gateway timeouts on long-running scans.
 *
 * @param connectionId - The IntegrationConnection ID (icn_...) to scan
 */
export const runPlatformScan = async (connectionId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  const orgId = session.session?.activeOrganizationId;
  if (!orgId) {
    return {
      success: false,
      error: 'No active organization',
    };
  }

  try {
    // Trigger the scan as a background task (same pattern as legacy runTests)
    // This avoids ALB/gateway timeouts on long-running Azure/AWS scans
    const handle = await tasks.trigger('run-cloud-security-scan', {
      connectionId,
      organizationId: orgId,
      providerSlug: 'platform',
      connectionName: connectionId,
    });

    // Poll for completion
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      const run = await runs.retrieve(handle.id);

      if (run.isCompleted) {
        // Revalidate cache
        const headersList = await headers();
        let path = headersList.get('x-pathname') || headersList.get('referer') || '';
        path = path.replace(/\/[a-z]{2}\//, '/');
        if (path) {
          revalidatePath(path);
        }
        revalidatePath(`/${orgId}/cloud-tests`);

        if (run.isSuccess) {
          const output = run.output as {
            success?: boolean;
            error?: string;
            findingsCount?: number;
            provider?: string;
            scannedAt?: string;
          } | null;

          if (output?.success === false) {
            return {
              success: false,
              error: output.error || 'Scan completed with errors',
            };
          }

          return {
            success: true,
            findingsCount: output?.findingsCount,
            provider: output?.provider,
            scannedAt: output?.scannedAt,
          };
        }

        return {
          success: false,
          error: 'Scan task failed or was canceled',
        };
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      attempts++;
    }

    // Polling timeout - the scan is still running in the background
    // Revalidate anyway so fresh data shows on next page load
    revalidatePath(`/${orgId}/cloud-tests`);

    return {
      success: false,
      error: 'Scan is taking longer than expected. Results will appear when complete.',
    };
  } catch (error) {
    console.error('Error running platform scan:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run scan',
    };
  }
};
