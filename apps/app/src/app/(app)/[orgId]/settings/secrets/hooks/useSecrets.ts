'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

export interface Secret {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

interface SecretsApiResponse {
  data: Secret[];
  count: number;
}

export const secretsListKey = () => ['/v1/secrets'] as const;

interface UseSecretsOptions {
  initialData?: Secret[];
}

export function useSecrets(options?: UseSecretsOptions) {
  const { initialData } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR(
    secretsListKey(),
    async () => {
      const response =
        await apiClient.get<SecretsApiResponse>('/v1/secrets');
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

  const secrets = Array.isArray(data) ? data : [];

  const createSecret = async (body: {
    name: string;
    value: string;
    description?: string | null;
    category?: string | null;
  }) => {
    const response = await apiClient.post<Secret>('/v1/secrets', body);
    if (response.error) throw new Error(response.error);
    await mutate();
    return response.data!;
  };

  const updateSecret = async (
    id: string,
    body: Record<string, string | null>,
  ) => {
    const response = await apiClient.put<Secret>(
      `/v1/secrets/${id}`,
      body,
    );
    if (response.error) throw new Error(response.error);
    await mutate();
    return response.data!;
  };

  const deleteSecret = async (id: string) => {
    const previous = secrets;

    // Optimistic removal
    await mutate(
      secrets.filter((s) => s.id !== id),
      false,
    );

    try {
      const response = await apiClient.delete(`/v1/secrets/${id}`);
      if (response.error) throw new Error(response.error);
      // Revalidate to get true server state
      await mutate();
    } catch (err) {
      // Rollback on error
      await mutate(previous, false);
      throw err;
    }
  };

  return {
    secrets,
    isLoading: isLoading && !data,
    error,
    mutate,
    createSecret,
    updateSecret,
    deleteSecret,
  };
}
