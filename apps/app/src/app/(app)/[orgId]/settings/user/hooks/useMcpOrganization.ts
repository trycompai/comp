'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

export interface McpOrganizationData {
  organizations: Array<{ id: string; name: string }>;
  selectedOrganizationId: string | null;
}

export const mcpOrganizationKey = () => ['/v1/mcp/organization'] as const;

interface UseMcpOrganizationOptions {
  initialData?: McpOrganizationData;
}

export function useMcpOrganization(options?: UseMcpOrganizationOptions) {
  const { initialData } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR(
    mcpOrganizationKey(),
    async () => {
      const response = await apiClient.get<McpOrganizationData>(
        '/v1/mcp/organization',
      );
      if (response.error) throw new Error(response.error);
      return response.data ?? null;
    },
    {
      fallbackData: initialData,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
    },
  );

  const saveOrganization = async (organizationId: string) => {
    const previous = data ?? initialData ?? null;
    // Optimistic update (guard against undefined per SWR safety).
    if (previous) {
      await mutate({ ...previous, selectedOrganizationId: organizationId }, false);
    }

    try {
      const response = await apiClient.put('/v1/mcp/organization', {
        organizationId,
      });
      if (response.error) throw new Error(response.error);
      await mutate();
    } catch (err) {
      // Roll back to the last known good value.
      if (previous) {
        await mutate(previous, false);
      }
      throw err;
    }
  };

  return {
    data: data ?? initialData ?? null,
    isLoading: isLoading && !data,
    error,
    mutate,
    saveOrganization,
  };
}
