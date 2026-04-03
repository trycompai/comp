import type { EmployeeTrainingVideoCompletion } from '@db';
import { env } from '@/env.mjs';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useCallback } from 'react';

const API_URL = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const SWR_KEY = `${API_URL}/v1/training/completions`;

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to fetch training completions');
  }
  return res.json();
};

export function useTrainingCompletions({
  fallbackData,
}: {
  fallbackData?: EmployeeTrainingVideoCompletion[];
} = {}) {
  const { data, error, isLoading, mutate } = useSWR<
    EmployeeTrainingVideoCompletion[]
  >(SWR_KEY, fetcher, {
    fallbackData,
    revalidateOnMount: !fallbackData,
    revalidateOnFocus: false,
  });

  const completions = Array.isArray(data) ? data : [];

  const markVideoComplete = useCallback(
    async (videoId: string) => {
      try {
        await mutate(
          async (current) => {
            const res = await fetch(
              `${API_URL}/v1/training/completions/${videoId}/complete`,
              {
                method: 'POST',
                credentials: 'include',
              },
            );

            if (!res.ok) {
              throw new Error('Failed to mark video as completed');
            }

            const updatedRecord: EmployeeTrainingVideoCompletion =
              await res.json();

            if (!Array.isArray(current)) return [updatedRecord];

            const exists = current.some((c) => c.videoId === videoId);
            if (exists) {
              return current.map((c) =>
                c.videoId === videoId ? updatedRecord : c,
              );
            }
            return [...current, updatedRecord];
          },
          { revalidate: false },
        );
      } catch {
        toast.error('Failed to mark video as completed');
      }
    },
    [mutate],
  );

  return {
    completions,
    isLoading,
    error,
    markVideoComplete,
  };
}
