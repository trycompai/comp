import { apiClient } from '@/lib/api-client';
import type { Task, TaskStatus } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

type TaskWithRelations = Task & {
  controls: { id: string; name: string }[];
  evidenceAutomations?: Array<{
    id: string;
    isEnabled: boolean;
    name: string;
    runs?: Array<{
      status: string;
      success: boolean | null;
      evaluationStatus: string | null;
      createdAt: Date;
      triggeredBy: string;
      runDuration: number | null;
    }>;
  }>;
};

interface TasksResponse {
  data: TaskWithRelations[];
  count: number;
}

interface UseTasksOptions {
  initialData?: TaskWithRelations[];
}

interface UseTasksReturn {
  tasks: TaskWithRelations[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => Promise<TaskWithRelations[] | undefined>;
  bulkDelete: (taskIds: string[]) => Promise<{ deletedCount: number }>;
  bulkUpdateStatus: (taskIds: string[], status: TaskStatus, reviewDate?: string) => Promise<{ updatedCount: number }>;
  bulkUpdateAssignee: (taskIds: string[], assigneeId: string | null) => Promise<{ updatedCount: number }>;
  createTask: (data: CreateTaskPayload) => Promise<void>;
  reorderTasks: (updates: ReorderUpdate[]) => Promise<void>;
}

interface CreateTaskPayload {
  title: string;
  description: string;
  assigneeId?: string | null;
  frequency?: string | null;
  department?: string | null;
  controlIds?: string[];
  taskTemplateId?: string | null;
}

interface ReorderUpdate {
  id: string;
  order: number;
  status: string;
}

export function useTasks({ initialData }: UseTasksOptions = {}): UseTasksReturn {
  const { orgId } = useParams<{ orgId: string }>();

  const { data, error, isLoading, mutate } = useSWR<TaskWithRelations[]>(
    orgId ? [`tasks-list`, orgId] : null,
    async () => {
      const response = await apiClient.get<TasksResponse>(
        '/v1/tasks?includeRelations=true',
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('Failed to fetch tasks');
      }

      return Array.isArray(response.data.data) ? response.data.data : [];
    },
    {
      fallbackData: initialData,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  const bulkDelete = async (taskIds: string[]): Promise<{ deletedCount: number }> => {
    const response = await apiClient.delete<{ deletedCount: number }>(
      '/v1/tasks/bulk',
      { taskIds },
    );
    if (response.error) throw new Error(response.error);
    await mutate();
    return { deletedCount: response.data?.deletedCount ?? taskIds.length };
  };

  const bulkUpdateStatus = async (
    taskIds: string[],
    status: TaskStatus,
    reviewDate?: string,
  ): Promise<{ updatedCount: number }> => {
    const payload: Record<string, unknown> = { taskIds, status };
    if (reviewDate) payload.reviewDate = reviewDate;

    const response = await apiClient.patch<{ updatedCount: number }>(
      '/v1/tasks/bulk',
      payload,
    );
    if (response.error) throw new Error(response.error);
    await mutate();
    return { updatedCount: response.data?.updatedCount ?? taskIds.length };
  };

  const bulkUpdateAssignee = async (
    taskIds: string[],
    assigneeId: string | null,
  ): Promise<{ updatedCount: number }> => {
    const response = await apiClient.patch<{ updatedCount: number }>(
      '/v1/tasks/bulk/assignee',
      { taskIds, assigneeId },
    );
    if (response.error) throw new Error(response.error);
    await mutate();
    return { updatedCount: response.data?.updatedCount ?? taskIds.length };
  };

  const createTask = async (payload: CreateTaskPayload): Promise<void> => {
    const response = await apiClient.post('/v1/tasks', payload);
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  const reorderTasks = async (updates: ReorderUpdate[]): Promise<void> => {
    const response = await apiClient.patch('/v1/tasks/reorder', { updates });
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  return {
    tasks: Array.isArray(data) ? data : [],
    isLoading,
    isError: !!error,
    mutate,
    bulkDelete,
    bulkUpdateStatus,
    bulkUpdateAssignee,
    createTask,
    reorderTasks,
  };
}
