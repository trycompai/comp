'use client';

import { api } from '@/lib/api-client';
import type {
  ConnectionListItemResponse,
  CredentialField,
  IntegrationConnectionResponse,
  IntegrationProviderResponse,
  OAuthAvailabilityResponse,
  OAuthStartResponse,
  TestConnectionResponse,
} from '@comp/integration-platform';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';

// ============================================================================
// Type aliases for internal use and re-export for consumers
// ============================================================================

// Internal aliases (keep existing names for backwards compatibility)
type IntegrationProvider = IntegrationProviderResponse;
type IntegrationConnection = IntegrationConnectionResponse;
type ConnectionListItem = ConnectionListItemResponse;
type OAuthAvailability = OAuthAvailabilityResponse;

// Re-export for consumers using the familiar names
export type {
  ConnectionListItem,
  CredentialField,
  IntegrationConnection,
  IntegrationProvider,
  OAuthAvailability,
  OAuthStartResponse,
  TestConnectionResponse,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all available integration providers
 */
export function useIntegrationProviders(activeOnly = false) {
  const endpoint = `/v1/integrations/connections/providers${activeOnly ? '?activeOnly=true' : ''}`;

  const { data, error, isLoading, mutate } = useSWR<IntegrationProvider[]>(
    ['integration-providers', activeOnly],
    async () => {
      const response = await api.get<IntegrationProvider[]>(endpoint);
      if (response.error) {
        throw new Error(response.error);
      }
      // Add slug alias for id
      return (response.data || []).map((p) => ({ ...p, slug: p.id }));
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute - providers don't change often
    },
  );

  return {
    providers: data || [],
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}

/**
 * Hook to fetch a specific provider's details
 */
export function useIntegrationProvider(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR<IntegrationProvider>(
    slug ? ['integration-provider', slug] : null,
    async () => {
      const response = await api.get<IntegrationProvider>(
        `/v1/integrations/connections/providers/${slug}`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );

  return {
    provider: data,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}

/**
 * Hook to fetch connections for the current organization
 */
export function useIntegrationConnections() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  const { data, error, isLoading, mutate } = useSWR<ConnectionListItem[]>(
    orgId ? ['integration-connections', orgId] : null,
    async () => {
      const response = await api.get<ConnectionListItem[]>(
        `/v1/integrations/connections?organizationId=${orgId}`,
        orgId,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    },
  );

  return {
    connections: data || [],
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}

/**
 * Hook to fetch a specific connection
 */
export function useIntegrationConnection(connectionId: string | null) {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  const { data, error, isLoading, mutate } = useSWR<IntegrationConnection>(
    connectionId && orgId ? ['integration-connection', connectionId, orgId] : null,
    async () => {
      const response = await api.get<IntegrationConnection>(
        `/v1/integrations/connections/${connectionId}`,
        orgId,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    },
  );

  return {
    connection: data,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}

/**
 * Hook to check OAuth availability for a provider
 */
export function useOAuthAvailability(providerSlug: string | null) {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  const { data, error, isLoading, mutate } = useSWR<OAuthAvailability>(
    providerSlug && orgId ? ['oauth-availability', providerSlug, orgId] : null,
    async () => {
      const response = await api.get<OAuthAvailability>(
        `/v1/integrations/oauth/availability?providerSlug=${providerSlug}&organizationId=${orgId}`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );

  return {
    availability: data,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}

/**
 * Hook for integration platform mutations (connect, disconnect, etc.)
 */
export function useIntegrationMutations() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  /**
   * Start OAuth flow for a provider
   */
  const startOAuth = useCallback(
    async (
      providerSlug: string,
      redirectUrl?: string,
    ): Promise<{ success: boolean; authorizationUrl?: string; error?: string }> => {
      if (!orgId) {
        return { success: false, error: 'No organization selected' };
      }

      const response = await api.post<OAuthStartResponse>('/v1/integrations/oauth/start', {
        providerSlug,
        organizationId: orgId,
        userId: '', // Will be filled by API from auth context
        redirectUrl,
      });

      if (response.error) {
        return { success: false, error: response.error };
      }

      return { success: true, authorizationUrl: response.data?.authorizationUrl };
    },
    [orgId],
  );

  /**
   * Create a connection with API key credentials
   */
  const createConnection = useCallback(
    async (
      providerSlug: string,
      credentials?: Record<string, string>,
    ): Promise<{ success: boolean; connectionId?: string; error?: string }> => {
      if (!orgId) {
        return { success: false, error: 'No organization selected' };
      }

      const response = await api.post<{ id: string }>(
        '/v1/integrations/connections',
        {
          providerSlug,
          organizationId: orgId,
          credentials,
        },
        orgId,
      );

      if (response.error) {
        return { success: false, error: response.error };
      }

      // Invalidate connections cache
      globalMutate(['integration-connections', orgId]);

      return { success: true, connectionId: response.data?.id };
    },
    [orgId],
  );

  /**
   * Test a connection
   */
  const testConnection = useCallback(
    async (connectionId: string): Promise<TestConnectionResponse> => {
      const response = await api.post<TestConnectionResponse>(
        `/v1/integrations/connections/${connectionId}/test`,
        undefined,
        orgId,
      );

      if (response.error) {
        return { success: false, message: response.error };
      }

      // Invalidate connection cache
      globalMutate(['integration-connection', connectionId, orgId]);
      globalMutate(['integration-connections', orgId]);

      return response.data || { success: false, message: 'Unknown error' };
    },
    [orgId],
  );

  /**
   * Pause a connection
   */
  const pauseConnection = useCallback(
    async (connectionId: string): Promise<{ success: boolean; error?: string }> => {
      const response = await api.post(
        `/v1/integrations/connections/${connectionId}/pause`,
        undefined,
        orgId,
      );

      if (response.error) {
        return { success: false, error: response.error };
      }

      globalMutate(['integration-connection', connectionId, orgId]);
      globalMutate(['integration-connections', orgId]);

      return { success: true };
    },
    [orgId],
  );

  /**
   * Resume a paused connection
   */
  const resumeConnection = useCallback(
    async (connectionId: string): Promise<{ success: boolean; error?: string }> => {
      const response = await api.post(
        `/v1/integrations/connections/${connectionId}/resume`,
        undefined,
        orgId,
      );

      if (response.error) {
        return { success: false, error: response.error };
      }

      globalMutate(['integration-connection', connectionId, orgId]);
      globalMutate(['integration-connections', orgId]);

      return { success: true };
    },
    [orgId],
  );

  /**
   * Disconnect (soft delete) a connection
   */
  const disconnectConnection = useCallback(
    async (connectionId: string): Promise<{ success: boolean; error?: string }> => {
      const response = await api.post(
        `/v1/integrations/connections/${connectionId}/disconnect`,
        undefined,
        orgId,
      );

      if (response.error) {
        return { success: false, error: response.error };
      }

      globalMutate(['integration-connection', connectionId, orgId]);
      globalMutate(['integration-connections', orgId]);

      return { success: true };
    },
    [orgId],
  );

  /**
   * Delete a connection permanently
   */
  const deleteConnection = useCallback(
    async (connectionId: string): Promise<{ success: boolean; error?: string }> => {
      const response = await api.delete(`/v1/integrations/connections/${connectionId}`, orgId);

      if (response.error) {
        return { success: false, error: response.error };
      }

      globalMutate(['integration-connections', orgId]);

      return { success: true };
    },
    [orgId],
  );

  return {
    startOAuth,
    createConnection,
    testConnection,
    pauseConnection,
    resumeConnection,
    disconnectConnection,
    deleteConnection,
  };
}

/**
 * Combined hook for common integration platform operations
 */
export function useIntegrationPlatform() {
  const {
    providers,
    isLoading: providersLoading,
    error: providersError,
    refresh: refreshProviders,
  } = useIntegrationProviders(true);
  const {
    connections,
    isLoading: connectionsLoading,
    error: connectionsError,
    refresh: refreshConnections,
  } = useIntegrationConnections();
  const mutations = useIntegrationMutations();

  return {
    // Data
    providers,
    connections,

    // Loading states
    isLoading: providersLoading || connectionsLoading,
    providersLoading,
    connectionsLoading,

    // Errors
    error: providersError || connectionsError,
    providersError,
    connectionsError,

    // Refresh functions
    refreshProviders,
    refreshConnections,
    refresh: () => {
      refreshProviders();
      refreshConnections();
    },

    // Mutations
    ...mutations,
  };
}
