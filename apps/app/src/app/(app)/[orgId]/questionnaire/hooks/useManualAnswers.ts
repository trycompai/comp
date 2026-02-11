'use client';

import useSWR from 'swr';
import { api } from '@/lib/api-client';
import type { ManualAnswer } from '../components/types';

const MANUAL_ANSWERS_KEY = '/v1/knowledge-base/manual-answers';

async function fetchManualAnswers(): Promise<ManualAnswer[]> {
  const response = await api.get<ManualAnswer[]>(MANUAL_ANSWERS_KEY);
  if (response.error) throw new Error(response.error);
  return Array.isArray(response.data) ? response.data : [];
}

interface UseManualAnswersOptions {
  organizationId: string;
  fallbackData?: ManualAnswer[];
}

export function useManualAnswers({ organizationId, fallbackData }: UseManualAnswersOptions) {
  const { data, error, isLoading, mutate } = useSWR<ManualAnswer[]>(
    MANUAL_ANSWERS_KEY,
    fetchManualAnswers,
    {
      fallbackData,
      revalidateOnMount: fallbackData === undefined,
    },
  );

  const deleteAnswer = async (answerId: string): Promise<boolean> => {
    const response = await api.post<{ success: boolean; error?: string }>(
      `/v1/knowledge-base/manual-answers/${answerId}/delete`,
      { organizationId },
    );

    if (response.error) throw new Error(response.error || 'Failed to delete manual answer');
    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Failed to delete manual answer');
    }

    await mutate(
      (current) => {
        if (!Array.isArray(current)) return current;
        return current.filter((a) => a.id !== answerId);
      },
      { revalidate: false },
    );

    return true;
  };

  const deleteAll = async (): Promise<boolean> => {
    const response = await api.post<{ success: boolean; error?: string }>(
      '/v1/knowledge-base/manual-answers/delete-all',
      { organizationId },
    );

    if (response.error) throw new Error(response.error || 'Failed to delete all manual answers');
    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Failed to delete all manual answers');
    }

    await mutate([], { revalidate: false });
    return true;
  };

  return {
    manualAnswers: Array.isArray(data) ? data : [],
    error,
    isLoading,
    mutate,
    deleteAnswer,
    deleteAll,
  };
}
