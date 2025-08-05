'use client';

import { apiClient, ApiResponse } from '@/lib/api-client';
import { useActiveOrganization } from '@/utils/auth-client';
import { useMemo } from 'react';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';

export interface UseApiSWROptions<T> extends SWRConfiguration<ApiResponse<T>> {
  organizationId?: string;
  enabled?: boolean;
}

/**
 * SWR-based hook for GET requests with automatic organization context
 * Provides caching, revalidation, and real-time updates
 */
export function useApiSWR<T = unknown>(
  endpoint: string | null, // null to disable the request
  options: UseApiSWROptions<T> = {},
): SWRResponse<ApiResponse<T>, Error> & {
  organizationId?: string;
} {
  const activeOrg = useActiveOrganization();
  const { organizationId: explicitOrgId, enabled = true, ...swrOptions } = options;

  // Determine organization context
  const organizationId = explicitOrgId || activeOrg.data?.id;

  // Create stable key for SWR
  const swrKey = useMemo(() => {
    if (!endpoint || !organizationId || !enabled) {
      return null;
    }
    return [endpoint, organizationId] as const;
  }, [endpoint, organizationId, enabled]);

  // SWR fetcher function
  const fetcher = async ([url, orgId]: readonly [string, string]): Promise<ApiResponse<T>> => {
    return apiClient.get<T>(url, orgId);
  };

  const swrResponse = useSWR(swrKey, fetcher, {
    // Default SWR options optimized for our API
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    errorRetryInterval: 1000,
    errorRetryCount: 3,
    ...swrOptions,
  });

  return {
    ...swrResponse,
    organizationId,
  };
}

/**
 * Hook specifically for fetching organization data
 */
export function useOrganization(
  organizationId?: string,
  options: UseApiSWROptions<{ id: string; name: string; slug: string }> = {},
) {
  return useApiSWR('/v1/organization', {
    ...options,
    organizationId,
  });
}

/**
 * Custom hook for fetching tasks with SWR
 */
export function useTasks(
  organizationId?: string,
  options: UseApiSWROptions<Array<{ id: string; title: string; status: string }>> = {},
) {
  return useApiSWR('/v1/tasks', {
    ...options,
    organizationId,
    // Refresh tasks every 30 seconds
    refreshInterval: 30000,
  });
}

/**
 * Custom hook for fetching a single task with SWR
 */
export function useTask(
  taskId: string | null,
  organizationId?: string,
  options: UseApiSWROptions<{
    id: string;
    title: string;
    status: string;
    description?: string;
  }> = {},
) {
  return useApiSWR(taskId ? `/v1/tasks/${taskId}` : null, {
    ...options,
    organizationId,
  });
}

/**
 * Example usage:
 *
 * ```typescript
 * function TaskList() {
 *   const { data, error, isLoading, mutate } = useTasks();
 *
 *   if (error) return <div>Failed to load tasks</div>;
 *   if (isLoading) return <div>Loading...</div>;
 *   if (data?.error) return <div>Error: {data.error}</div>;
 *
 *   return (
 *     <div>
 *       {data?.data?.map(task => (
 *         <div key={task.id}>{task.title}</div>
 *       ))}
 *       <button onClick={() => mutate()}>Refresh</button>
 *     </div>
 *   );
 * }
 *
 * function TaskDetail({ taskId }: { taskId: string }) {
 *   const { data, error, isLoading } = useTask(taskId);
 *
 *   // Component implementation...
 * }
 *
 * // Using different organization
 * function CrossOrgData() {
 *   const { data } = useOrganization('other-org-id');
 *   // Component implementation...
 * }
 * ```
 */
