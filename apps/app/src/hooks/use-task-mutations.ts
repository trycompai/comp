import { apiClient } from '@/lib/api-client';
import type { Task, TaskStatus } from '@db';
import { useSWRConfig } from 'swr';

interface UpdateTaskPayload {
  status?: TaskStatus;
  assigneeId?: string | null;
  title?: string;
  description?: string;
  frequency?: string | null;
  department?: string | null;
}

interface CreateTaskPayload {
  title: string;
  description: string;
  assigneeId?: string | null;
  vendorId?: string;
}

function isTaskOrRiskCacheKey(key: unknown): boolean {
  if (Array.isArray(key) && typeof key[0] === 'string') {
    return (
      key[0].includes('/v1/tasks') ||
      key[0].includes('/v1/risks') ||
      key[0].startsWith('task-') ||
      key[0].startsWith('tasks-')
    );
  }
  if (typeof key === 'string') {
    return key.includes('/v1/tasks') || key.includes('/v1/risks');
  }
  return false;
}

/**
 * Lightweight hook for task mutations with global SWR cache invalidation.
 * Use this in components outside the main tasks page (e.g., vendor task forms,
 * risk task forms) where importing the full `useTasks` hook is not appropriate.
 * Also invalidates risk caches since tasks and risks are often displayed together.
 */
export function useTaskMutations() {
  const { mutate: globalMutate } = useSWRConfig();

  const invalidateRelatedCaches = async () => {
    await globalMutate(isTaskOrRiskCacheKey, undefined, { revalidate: true });
  };

  const updateTask = async (
    taskId: string,
    data: UpdateTaskPayload,
  ): Promise<void> => {
    const response = await apiClient.patch<Task>(
      `/v1/tasks/${taskId}`,
      data,
    );
    if (response.error) throw new Error(response.error);
    await invalidateRelatedCaches();
  };

  const createTask = async (data: CreateTaskPayload): Promise<void> => {
    const response = await apiClient.post('/v1/tasks', data);
    if (response.error) throw new Error(response.error);
    await invalidateRelatedCaches();
  };

  return {
    updateTask,
    createTask,
  };
}
