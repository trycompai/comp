'use server';

import { auth } from '@/utils/auth';
import { serverApi } from '@/lib/server-api-client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const MAX_POLL_ATTEMPTS = 150; // Max 5 minutes (150 * 2 seconds)
const POLL_INTERVAL_MS = 2000;

/**
 * Get auth headers for calling guarded API endpoints server-side.
 * Uses Better Auth's jwt plugin to generate a Bearer token from the session cookie.
 */
async function getAuthHeaders(organizationId: string): Promise<Record<string, string>> {
  const reqHeaders = await headers();
  const authHeaders: Record<string, string> = {
    'X-Organization-Id': organizationId,
  };

  // Get a JWT from Better Auth using the session cookie
  const tokenResponse = await auth.api.getToken({
    headers: reqHeaders,
  });

  if (tokenResponse?.token) {
    authHeaders['Authorization'] = `Bearer ${tokenResponse.token}`;
  }

  return authHeaders;
}

/**
 * Run cloud security scan for a new platform connection.
 * Triggers a background task via the NestJS API and polls for completion,
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
    const authHeaders = await getAuthHeaders(orgId);

    // Trigger the scan via API (task is defined in the API's trigger.dev project)
    const triggerResponse = await serverApi.post<{ runId: string }>(
      `/v1/cloud-security/trigger/${connectionId}`,
      undefined,
      authHeaders,
    );

    if (triggerResponse.error || !triggerResponse.data?.runId) {
      return {
        success: false,
        error: triggerResponse.error || 'Failed to trigger scan',
      };
    }

    const { runId } = triggerResponse.data;

    // Poll for completion
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      const statusResponse = await serverApi.get<{
        completed: boolean;
        success: boolean;
        output: {
          success?: boolean;
          error?: string;
          findingsCount?: number;
          provider?: string;
          scannedAt?: string;
        } | null;
      }>(`/v1/cloud-security/runs/${runId}?connectionId=${connectionId}`, authHeaders);

      if (statusResponse.error) {
        return {
          success: false,
          error: statusResponse.error,
        };
      }

      if (statusResponse.data?.completed) {
        // Revalidate cache
        const headersList = await headers();
        let path =
          headersList.get('x-pathname') || headersList.get('referer') || '';
        path = path.replace(/\/[a-z]{2}\//, '/');
        if (path) {
          revalidatePath(path);
        }
        revalidatePath(`/${orgId}/cloud-tests`);

        if (statusResponse.data.success) {
          const output = statusResponse.data.output;

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
      error:
        'Scan is taking longer than expected. Results will appear when complete.',
    };
  } catch (error) {
    console.error('Error running platform scan:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run scan',
    };
  }
};
