'use client';

import { apiClient } from '@/lib/api-client';
import type { ControlWithRelations } from '../data/queries';
import useSWR from 'swr';

interface ControlsApiResponse {
  data: ControlWithRelations[];
  pageCount: number;
}

interface CreateControlPayload {
  name: string;
  description: string;
  policyIds?: string[];
  taskIds?: string[];
  requirementMappings?: {
    requirementId: string;
    frameworkInstanceId: string;
  }[];
}

export const controlsKey = () => ['/v1/controls'] as const;

interface UseControlsOptions {
  initialData?: ControlWithRelations[];
}

export function useControls(options?: UseControlsOptions) {
  const { initialData } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR(
    controlsKey(),
    async () => {
      const response =
        await apiClient.get<ControlsApiResponse>('/v1/controls');
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

  const controls = Array.isArray(data) ? data : [];

  const createControl = async (payload: CreateControlPayload) => {
    const response = await apiClient.post('/v1/controls', payload);
    if (response.error) throw new Error(response.error);
    await mutate();
    return response.data;
  };

  const deleteControl = async (id: string) => {
    const previous = controls;

    // Optimistic removal
    await mutate(
      controls.filter((c) => c.id !== id),
      false,
    );

    try {
      const response = await apiClient.delete(`/v1/controls/${id}`);
      if (response.error) throw new Error(response.error);
      await mutate();
    } catch (err) {
      // Rollback on error
      await mutate(previous, false);
      throw err;
    }
  };

  return {
    controls,
    isLoading: isLoading && !data,
    error,
    mutate,
    createControl,
    deleteControl,
  };
}
