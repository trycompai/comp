'use client';

import { apiClient } from '@/lib/api-client';
import type { FrameworkInstanceWithControls } from '../types';
import useSWR from 'swr';

interface FrameworksApiResponse {
  data: FrameworkInstanceWithControls[];
  count: number;
}

interface AddFrameworksResponse {
  success: boolean;
  frameworksAdded: number;
}

export const frameworksKey = () => ['/v1/frameworks'] as const;

interface UseFrameworksOptions {
  initialData?: FrameworkInstanceWithControls[];
}

export function useFrameworks(options?: UseFrameworksOptions) {
  const { initialData } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR(
    frameworksKey(),
    async () => {
      const response = await apiClient.get<FrameworksApiResponse>(
        '/v1/frameworks?includeControls=true&includeScores=true',
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) return [];
      return response.data.data;
    },
    {
      fallbackData: initialData,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
    },
  );

  const frameworks = Array.isArray(data) ? data : [];

  const addFrameworks = async (frameworkIds: string[]) => {
    const response = await apiClient.post<AddFrameworksResponse>(
      '/v1/frameworks',
      { frameworkIds },
    );
    if (response.error) throw new Error(response.error);
    await mutate();
    return response.data;
  };

  const deleteFramework = async (id: string) => {
    const previous = frameworks;

    // Optimistic removal
    await mutate(
      frameworks.filter((f) => f.id !== id),
      false,
    );

    try {
      const response = await apiClient.delete(`/v1/frameworks/${id}`);
      if (response.error) throw new Error(response.error);
      await mutate();
    } catch (err) {
      // Rollback on error
      await mutate(previous, false);
      throw err;
    }
  };

  return {
    frameworks,
    isLoading: isLoading && !data,
    error,
    mutate,
    addFrameworks,
    deleteFramework,
  };
}
