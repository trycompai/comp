'use client';

import { apiClient } from '@/lib/api-client';
import type { Context } from '@db';
import useSWR from 'swr';

interface ContextListResponse {
  data: Context[];
  count: number;
  pageCount: number;
}

export const contextEntriesKey = () => ['/v1/context'] as const;

interface UseContextEntriesOptions {
  initialData?: Context[];
}

export function useContextEntries(options?: UseContextEntriesOptions) {
  const { initialData } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR(
    contextEntriesKey(),
    async () => {
      const response =
        await apiClient.get<ContextListResponse>('/v1/context?perPage=500');
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

  const entries = Array.isArray(data) ? data : [];

  const createEntry = async (body: { question: string; answer: string }) => {
    const response = await apiClient.post<Context>('/v1/context', body);
    if (response.error) throw new Error(response.error);
    await mutate();
    return response.data!;
  };

  const updateEntry = async (
    id: string,
    body: { question: string; answer: string },
  ) => {
    const response = await apiClient.patch<Context>(
      `/v1/context/${id}`,
      body,
    );
    if (response.error) throw new Error(response.error);
    await mutate();
    return response.data!;
  };

  const deleteEntry = async (id: string) => {
    const previous = entries;

    await mutate(
      entries.filter((e) => e.id !== id),
      false,
    );

    try {
      const response = await apiClient.delete(`/v1/context/${id}`);
      if (response.error) throw new Error(response.error);
      await mutate();
    } catch (err) {
      await mutate(previous, false);
      throw err;
    }
  };

  return {
    entries,
    isLoading: isLoading && !data,
    error,
    mutate,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
