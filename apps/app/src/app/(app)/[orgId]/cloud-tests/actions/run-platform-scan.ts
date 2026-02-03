'use server';

import { auth } from '@/utils/auth';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

/**
 * Run cloud security scan for a new platform connection.
 * This server action calls the API and properly revalidates the cache,
 * ensuring consistent behavior with the legacy runTests action.
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
    // Call the cloud security scan API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
    if (!apiUrl) {
      return {
        success: false,
        error: 'API URL not configured',
      };
    }

    const response = await fetch(`${apiUrl}/v1/cloud-security/scan/${connectionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': orgId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Scan failed with status ${response.status}`,
      };
    }

    const result = await response.json();

    // Revalidate the cloud-tests page to refresh data
    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');
    if (path) {
      revalidatePath(path);
    }
    // Also revalidate the org's cloud-tests path specifically
    revalidatePath(`/${orgId}/cloud-tests`);

    return {
      success: true,
      findingsCount: result.findingsCount,
      provider: result.provider,
      scannedAt: result.scannedAt,
    };
  } catch (error) {
    console.error('Error running platform scan:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run scan',
    };
  }
};
