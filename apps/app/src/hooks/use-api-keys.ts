'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  scopes: string[];
}

interface ApiKeysListResponse {
  data: ApiKey[];
  count: number;
}

export const apiKeysListKey = () => ['/v1/organization/api-keys'] as const;

interface UseApiKeysOptions {
  initialData?: ApiKey[];
}

export function useApiKeys(options?: UseApiKeysOptions) {
  const { initialData } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR(
    apiKeysListKey(),
    async () => {
      const response =
        await apiClient.get<ApiKeysListResponse>('/v1/organization/api-keys');
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

  const apiKeys = Array.isArray(data) ? data : [];

  const createApiKey = async (body: {
    name: string;
    expiresAt: string;
    scopes?: string[];
  }): Promise<{ key: string }> => {
    const response = await apiClient.post<{ key: string }>(
      '/v1/organization/api-keys',
      body,
    );
    if (response.error) throw new Error(response.error);
    await mutate();
    return response.data!;
  };

  const revokeApiKey = async (id: string) => {
    const previous = apiKeys;

    // Optimistic removal
    await mutate(
      apiKeys.filter((k) => k.id !== id),
      false,
    );

    try {
      const response = await apiClient.post('/v1/organization/api-keys/revoke', { id });
      if (response.error) throw new Error(response.error);
      await mutate();
    } catch (err) {
      await mutate(previous, false);
      throw err;
    }
  };

  return {
    apiKeys,
    isLoading: isLoading && !data,
    error,
    mutate,
    createApiKey,
    revokeApiKey,
  };
}

export function useAvailableScopes() {
  const { data, error, isLoading } = useSWR(
    ['/v1/organization/api-keys/available-scopes'],
    async () => {
      const response = await apiClient.get<{ data: string[] }>(
        '/v1/organization/api-keys/available-scopes',
      );
      if (response.error) throw new Error(response.error);
      return response.data?.data ?? [];
    },
    { revalidateOnFocus: false },
  );

  return {
    availableScopes: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
}
