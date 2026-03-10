'use client';

import { api } from '@/lib/api-client';
import useSWR from 'swr';
import { useParams } from 'next/navigation';

interface ActivityLog {
  id: string;
  timestamp: string;
  description: string;
  data: any;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export function useTaskItemActivity(taskItemId: string | null) {
  const { orgId } = useParams<{ orgId: string }>();

  const { data, error, isLoading, mutate } = useSWR<ActivityLog[]>(
    taskItemId && orgId ? [`/v1/task-management/${taskItemId}/activity`, orgId] : null,
    async ([endpoint]: [string, string]) => {
      const response = await api.get<ActivityLog[]>(endpoint);
      if (response.error) throw new Error(response.error);
      return response.data || [];
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    activity: data || [],
    isLoading: !data && !error,
    error,
    mutate,
  };
}

