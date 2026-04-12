'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR, UseApiSWROptions } from '@/hooks/use-api-swr';
import { ApiResponse } from '@/lib/api-client';
import { useCallback } from 'react';

// --- Types ---

interface CheckLastRun {
  status: string;
  passedCount: number;
  failedCount: number;
  completedAt: string | null;
}

interface VendorCheck {
  checkId: string;
  checkName: string;
  description: string;
  enabled: boolean;
  disabledReason: string | null;
  lastRun: CheckLastRun | null;
}

export interface ConnectedIntegration {
  connectionId: string;
  providerSlug: string;
  providerName: string;
  status: string;
  lastSyncAt: string | null;
  checks: VendorCheck[];
}

export interface AvailableIntegration {
  providerSlug: string;
  providerName: string;
  category: string;
  authType: string;
  checks: Array<{
    checkId: string;
    checkName: string;
    description: string;
  }>;
}

export interface VendorIntegrationsResponse {
  connected: ConnectedIntegration[];
  available: AvailableIntegration[];
}

export interface ChecksSummary {
  total: number;
  passing: number;
  failing: number;
  lastRunAt: string | null;
}

export interface CheckHistoryEntry {
  checkId: string;
  checkName: string;
  connectionId: string;
  status: string;
  passedCount: number;
  failedCount: number;
  completedAt: string;
}

// --- Hooks ---

/**
 * Fetches connected and available integrations for a vendor.
 */
export function useVendorIntegrations(
  vendorId: string | null,
  options: UseApiSWROptions<VendorIntegrationsResponse> = {},
) {
  const swrResponse = useApiSWR<VendorIntegrationsResponse>(
    vendorId ? `/v1/vendors/${vendorId}/integrations` : null,
    {
      revalidateOnFocus: false,
      ...options,
    },
  );

  const connected = swrResponse.data?.data?.connected ?? [];
  const available = swrResponse.data?.data?.available ?? [];

  return {
    ...swrResponse,
    connected,
    available,
    hasConnections: connected.length > 0,
  };
}

/**
 * Fetches a compact checks summary for the vendor overview.
 */
export function useVendorChecksSummary(
  vendorId: string | null,
  options: UseApiSWROptions<ChecksSummary> = {},
) {
  const swrResponse = useApiSWR<ChecksSummary>(
    vendorId ? `/v1/vendors/${vendorId}/integrations/checks/summary` : null,
    {
      revalidateOnFocus: false,
      ...options,
    },
  );

  const summary = swrResponse.data?.data ?? null;

  return {
    ...swrResponse,
    summary,
  };
}

/**
 * Fetches 7-day check run history for a vendor.
 */
export function useVendorCheckHistory(
  vendorId: string | null,
  options: UseApiSWROptions<CheckHistoryEntry[]> = {},
) {
  const swrResponse = useApiSWR<CheckHistoryEntry[]>(
    vendorId ? `/v1/vendors/${vendorId}/integrations/checks/history?days=7` : null,
    {
      revalidateOnFocus: false,
      ...options,
    },
  );

  const raw = swrResponse.data?.data;
  const history = Array.isArray(raw) ? raw : (raw as unknown as { data?: CheckHistoryEntry[] })?.data ?? [];

  return {
    ...swrResponse,
    history,
  };
}

// --- Mutation types ---

interface OAuthStartResponse {
  authorizationUrl: string;
}

interface RunChecksResponse {
  success: boolean;
  triggered: number;
}

/**
 * Provides mutation actions for vendor integrations:
 * connect (OAuth), disconnect, toggle checks, and run checks.
 */
export function useVendorIntegrationActions() {
  const api = useApi();

  const startOAuthConnect = useCallback(
    async ({
      vendorId,
      providerSlug,
      redirectUrl,
    }: {
      vendorId: string;
      providerSlug: string;
      redirectUrl?: string;
    }) => {
      const response = await api.post<OAuthStartResponse>(
        '/v1/integrations/oauth/start',
        {
          providerSlug,
          userId: '', // Filled by API from auth context
          vendorId,
          redirectUrl,
        },
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const disconnect = useCallback(
    async ({ vendorId, connectionId }: { vendorId: string; connectionId: string }) => {
      const response = await api.post(
        `/v1/vendors/${vendorId}/integrations/disconnect`,
        { connectionId },
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return { success: true };
    },
    [api],
  );

  const toggleCheck = useCallback(
    async ({
      vendorId,
      connectionId,
      checkId,
      enabled,
    }: {
      vendorId: string;
      connectionId: string;
      checkId: string;
      enabled: boolean;
    }) => {
      const response = await api.patch(
        `/v1/vendors/${vendorId}/integrations/checks/${checkId}`,
        { connectionId, enabled },
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return { success: true };
    },
    [api],
  );

  const runChecks = useCallback(
    async ({ vendorId }: { vendorId: string }) => {
      const response = await api.post<RunChecksResponse>(
        `/v1/vendors/${vendorId}/integrations/checks/run`,
        {},
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const runSingleCheck = useCallback(
    async ({ connectionId, checkId }: { connectionId: string; checkId: string }) => {
      const response = await api.post(
        `/v1/integrations/checks/connections/${connectionId}/run/${checkId}`,
        {},
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return { success: true };
    },
    [api],
  );

  return {
    startOAuthConnect,
    disconnect,
    toggleCheck,
    runChecks,
    runSingleCheck,
  };
}
