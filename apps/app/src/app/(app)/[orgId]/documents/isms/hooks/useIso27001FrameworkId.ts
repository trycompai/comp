'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { ISO27001_NAMES } from '../isms-types';

interface FrameworkListResponse {
  data: Array<{
    id: string;
    frameworkId: string;
    framework: { id: string; name: string; description: string | null; visible: boolean };
  }>;
}

/**
 * Resolve the org's active ISO 27001 framework instance id (or null). Shared by
 * the Company Forms overview and the ISMS overview so both detect ISO 27001 the
 * same way.
 */
export function useIso27001FrameworkId(organizationId: string): string | null {
  const { data } = useSWR<FrameworkListResponse>(
    ['/v1/frameworks', organizationId] as const,
    async ([endpoint, orgId]: readonly [string, string]) => {
      const response = await apiClient.get<FrameworkListResponse>(endpoint, orgId);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load frameworks');
      }
      return response.data;
    },
  );

  return useMemo(() => {
    const frameworks = data?.data ?? [];
    const match = frameworks.find(
      (instance) =>
        !!instance.framework?.name && ISO27001_NAMES.includes(instance.framework.name),
    );
    return match?.frameworkId ?? null;
  }, [data]);
}
