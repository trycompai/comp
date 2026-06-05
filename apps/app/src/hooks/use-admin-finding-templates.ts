'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

interface FindingTemplate {
  id: string;
  category: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export const findingTemplatesKey = () => ['/v1/finding-template'] as const;

/**
 * Loads all finding templates from the platform API.
 *
 * The `/v1/finding-template` GET endpoint returns a raw array (not a
 * `{ data, count }` envelope), so we consume `response.data` directly.
 */
export function useAdminFindingTemplates() {
  const { data, error, isLoading, mutate } = useSWR(
    findingTemplatesKey(),
    async () => {
      const response = await apiClient.get<FindingTemplate[]>('/v1/finding-template');
      if (response.error) throw new Error(response.error);
      return response.data ?? [];
    },
    {
      revalidateOnFocus: false,
    },
  );

  const templates = Array.isArray(data) ? data : [];

  return {
    templates,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

export type { FindingTemplate };
