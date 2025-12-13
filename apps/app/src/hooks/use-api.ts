'use client';

import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { useApiSWR, UseApiSWROptions } from './use-api-swr';

/**
 * Hook that provides API client with automatic organization context from URL params
 */
export function useApi() {
  const params = useParams();
  const orgIdFromParams = params?.orgId as string;

  const apiCall = useCallback(
    <T = unknown>(
      method: 'get' | 'post' | 'put' | 'patch' | 'delete',
      endpoint: string,
      bodyOrOrgId?: unknown,
      explicitOrgId?: string,
    ) => {
      // Handle different parameter patterns
      let body: unknown;
      let organizationId: string | undefined;

      if (method === 'get' || method === 'delete') {
        // For GET/DELETE: second param is organizationId
        organizationId =
          (typeof bodyOrOrgId === 'string' ? bodyOrOrgId : undefined) ||
          explicitOrgId ||
          orgIdFromParams;
      } else {
        // For POST/PUT/PATCH: second param is body, third is organizationId
        body = bodyOrOrgId;
        organizationId = explicitOrgId || orgIdFromParams;
      }

      if (!organizationId) {
        throw new Error('Organization context required. Ensure user has an active organization.');
      }

      // Call appropriate API method
      switch (method) {
        case 'get':
          return api.get<T>(endpoint, organizationId);
        case 'post':
          return api.post<T>(endpoint, body, organizationId);
        case 'put':
          return api.put<T>(endpoint, body, organizationId);
        case 'patch':
          return api.patch<T>(endpoint, body, organizationId);
        case 'delete':
          return api.delete<T>(endpoint, organizationId);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    [orgIdFromParams],
  );

  return {
    // Organization context
    organizationId: orgIdFromParams,

    // Standard API methods (for mutations)
    get: useCallback(
      <T = unknown>(endpoint: string, organizationId?: string) =>
        apiCall<T>('get', endpoint, organizationId),
      [apiCall],
    ),

    post: useCallback(
      <T = unknown>(endpoint: string, body?: unknown, organizationId?: string) =>
        apiCall<T>('post', endpoint, body, organizationId),
      [apiCall],
    ),

    put: useCallback(
      <T = unknown>(endpoint: string, body?: unknown, organizationId?: string) =>
        apiCall<T>('put', endpoint, body, organizationId),
      [apiCall],
    ),

    patch: useCallback(
      <T = unknown>(endpoint: string, body?: unknown, organizationId?: string) =>
        apiCall<T>('patch', endpoint, body, organizationId),
      [apiCall],
    ),

    delete: useCallback(
      <T = unknown>(endpoint: string, organizationId?: string) =>
        apiCall<T>('delete', endpoint, organizationId),
      [apiCall],
    ),

    // SWR-based GET requests (recommended for data fetching)
    useSWR: <T = unknown>(endpoint: string | null, options?: UseApiSWROptions<T>) => {
      return useApiSWR<T>(endpoint, {
        organizationId: orgIdFromParams,
        ...options,
      });
    },
  };
}

/**
 * Example usage in a component:
 *
 * ```typescript
 * function MyComponent() {
 *   const api = useApi();
 *
 *   // ✅ RECOMMENDED: Use SWR for data fetching (automatic caching, revalidation)
 *   const { data: tasksData, error: tasksError, isLoading: tasksLoading, mutate: refreshTasks } =
 *     api.useSWR<Task[]>('/v1/tasks');
 *
 *   const { data: orgData } = api.useSWR('/v1/organization');
 *
 *   // For mutations, use regular API methods
 *   const createTask = async (taskData: unknown) => {
 *     const response = await api.post('/v1/tasks', taskData);
 *     if (response.error) {
 *       console.error('Failed to create task:', response.error);
 *       return;
 *     }
 *
 *     // Refresh the tasks list after creating
 *     refreshTasks();
 *     console.log('Created task:', response.data);
 *   };
 *
 *   // Override organization for specific SWR request
 *   const { data: otherOrgData } = api.useSWR('/v1/data', {
 *     organizationId: 'other-org-id'
 *   });
 *
 *   if (tasksLoading) return <div>Loading...</div>;
 *   if (tasksError || tasksData?.error) return <div>Error</div>;
 *
 *   return (
 *     <div>
 *       {tasksData?.data?.map(task => (
 *         <div key={task.id}>{task.title}</div>
 *       ))}
 *       <button onClick={() => refreshTasks()}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
