import { api } from '@/lib/api-client';
import { Control, Task } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

interface TaskData extends Task {
  fileUrls?: string[];
  controls?: Control[];
}

interface UseTaskReturn {
  task: TaskData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<any>;
}

interface UseTaskOptions {
  initialData?: TaskData;
}

export function useTask({ initialData }: UseTaskOptions = {}): UseTaskReturn {
  const { orgId, taskId } = useParams<{
    orgId: string;
    taskId: string;
  }>();

  const { data, error, isLoading, mutate } = useSWR(
    // Only fetch if both orgId and taskId are available
    orgId && taskId ? [`task-${taskId}`, orgId, taskId] : null,
    async () => {
      // Guard clause - should not happen due to key check, but extra safety
      if (!orgId || !taskId) {
        throw new Error('Organization ID and Task ID are required');
      }

      const response = await api.get<TaskData>(`/v1/tasks/${taskId}`, orgId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('Failed to fetch task');
      }

      return response.data;
    },
    {
      fallbackData: initialData,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  return {
    task: data,
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    mutate,
  };
}
