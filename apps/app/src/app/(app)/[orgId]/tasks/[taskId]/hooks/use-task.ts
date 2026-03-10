import { apiClient } from '@/lib/api-client';
import type { Control, Task, TaskStatus } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

interface TaskData extends Task {
  fileUrls?: string[];
  controls?: Control[];
}

interface UpdateTaskPayload {
  status?: TaskStatus;
  assigneeId?: string | null;
  approverId?: string | null;
  frequency?: string | null;
  department?: string | null;
  reviewDate?: string | null;
  title?: string;
  description?: string;
}

interface UseTaskReturn {
  task: TaskData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<TaskData | undefined>;
  updateTask: (data: UpdateTaskPayload) => Promise<void>;
  deleteTask: () => Promise<void>;
  regenerateTask: () => Promise<void>;
  submitForReview: (approverId: string) => Promise<void>;
  approveTask: () => Promise<void>;
  rejectTask: () => Promise<void>;
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
    orgId && taskId ? [`task-${taskId}`, orgId, taskId] : null,
    async () => {
      if (!orgId || !taskId) {
        throw new Error('Organization ID and Task ID are required');
      }

      const response = await apiClient.get<TaskData>(`/v1/tasks/${taskId}`);

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

  const updateTask = async (payload: UpdateTaskPayload): Promise<void> => {
    if (!taskId) throw new Error('Task ID is required');
    const response = await apiClient.patch<Task>(`/v1/tasks/${taskId}`, payload);
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  const deleteTask = async (): Promise<void> => {
    if (!taskId) throw new Error('Task ID is required');
    const response = await apiClient.delete(`/v1/tasks/${taskId}`);
    if (response.error) throw new Error(response.error);
  };

  const regenerateTask = async (): Promise<void> => {
    if (!taskId) throw new Error('Task ID is required');
    const response = await apiClient.post(`/v1/tasks/${taskId}/regenerate`);
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  const submitForReview = async (approverId: string): Promise<void> => {
    if (!taskId) throw new Error('Task ID is required');
    const response = await apiClient.post(`/v1/tasks/${taskId}/submit-for-review`, { approverId });
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  const approveTask = async (): Promise<void> => {
    if (!taskId) throw new Error('Task ID is required');
    const response = await apiClient.post(`/v1/tasks/${taskId}/approve`, {});
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  const rejectTask = async (): Promise<void> => {
    if (!taskId) throw new Error('Task ID is required');
    const response = await apiClient.post(`/v1/tasks/${taskId}/reject`, {});
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  return {
    task: data,
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    mutate,
    updateTask,
    deleteTask,
    regenerateTask,
    submitForReview,
    approveTask,
    rejectTask,
  };
}
