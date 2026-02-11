import { api } from '@/lib/api-client';
import type { AuditLog, User } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

export type ActivityLog = AuditLog & {
  user: Pick<User, 'id' | 'name' | 'email' | 'image'> | null;
};

interface ActivityResponse {
  logs: ActivityLog[];
  total: number;
}

interface UseTaskActivityOptions {
  take?: number;
  skip?: number;
}

export function useTaskActivity({ take = 3, skip = 0 }: UseTaskActivityOptions = {}) {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();

  const { data, error, isLoading, mutate } = useSWR(
    orgId && taskId ? [`task-activity-${taskId}`, orgId, taskId, skip, take] : null,
    async () => {
      if (!orgId || !taskId) {
        throw new Error('Organization ID and Task ID are required');
      }

      const response = await api.get<ActivityResponse>(
        `/v1/tasks/${taskId}/activity?skip=${skip}&take=${take}`,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data ?? { logs: [], total: 0 };
    },
    {
      revalidateOnFocus: true,
    },
  );

  return {
    logs: data?.logs ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}
