import { serverApi } from '@/lib/server-api-client';

export interface SyncProviderInfo {
  slug: string;
  name: string;
  logoUrl: string;
  connected: boolean;
  connectionId: string | null;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
}

export interface EmployeeSyncConnectionsData {
  googleWorkspaceConnectionId: string | null;
  ripplingConnectionId: string | null;
  jumpcloudConnectionId: string | null;
  rampConnectionId: string | null;
  selectedProvider: string | null | undefined;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  /** All providers that support sync (built-in + dynamic) */
  availableProviders: SyncProviderInfo[];
}

interface ConnectionStatus {
  connected: boolean;
  connectionId: string | null;
  lastSyncAt?: string | null;
  nextSyncAt?: string | null;
}

export async function getEmployeeSyncConnections(
  organizationId: string,
): Promise<EmployeeSyncConnectionsData> {
  const [gwResponse, ripplingResponse, jumpcloudResponse, rampResponse, providerResponse, availableResponse] =
    await Promise.all([
      serverApi.post<ConnectionStatus>(
        `/v1/integrations/sync/google-workspace/status?organizationId=${organizationId}`,
      ),
      serverApi.post<ConnectionStatus>(
        `/v1/integrations/sync/rippling/status?organizationId=${organizationId}`,
      ),
      serverApi.post<ConnectionStatus>(
        `/v1/integrations/sync/jumpcloud/status?organizationId=${organizationId}`,
      ),
      serverApi.post<ConnectionStatus>(
        `/v1/integrations/sync/ramp/status?organizationId=${organizationId}`,
      ),
      serverApi.get<{ provider: string | null }>(
        `/v1/integrations/sync/employee-sync-provider?organizationId=${organizationId}`,
      ),
      serverApi.get<{ providers: SyncProviderInfo[] }>(
        `/v1/integrations/sync/available-providers?organizationId=${organizationId}`,
      ).catch(() => ({ data: null, error: null, status: 500 })),
    ]);

  const availableProviders = availableResponse.data?.providers ?? [];

  // Get sync times from the selected provider
  // Check built-in providers first, then fall back to available-providers data
  const selectedProviderSlug = providerResponse.data?.provider;
  let selectedSyncTimes: { lastSyncAt?: string | null; nextSyncAt?: string | null } | null = null;

  if (selectedProviderSlug === 'google-workspace') {
    selectedSyncTimes = gwResponse.data ?? null;
  } else if (selectedProviderSlug === 'rippling') {
    selectedSyncTimes = ripplingResponse.data ?? null;
  } else if (selectedProviderSlug === 'jumpcloud') {
    selectedSyncTimes = jumpcloudResponse.data ?? null;
  } else if (selectedProviderSlug === 'ramp') {
    selectedSyncTimes = rampResponse.data ?? null;
  } else if (selectedProviderSlug) {
    // Dynamic provider — get sync times from available-providers data
    const dynProvider = availableProviders.find((p) => p.slug === selectedProviderSlug);
    if (dynProvider) {
      selectedSyncTimes = { lastSyncAt: dynProvider.lastSyncAt, nextSyncAt: dynProvider.nextSyncAt };
    }
  }

  return {
    googleWorkspaceConnectionId:
      gwResponse.data?.connected && gwResponse.data.connectionId
        ? gwResponse.data.connectionId
        : null,
    ripplingConnectionId:
      ripplingResponse.data?.connected && ripplingResponse.data.connectionId
        ? ripplingResponse.data.connectionId
        : null,
    jumpcloudConnectionId:
      jumpcloudResponse.data?.connected && jumpcloudResponse.data.connectionId
        ? jumpcloudResponse.data.connectionId
        : null,
    rampConnectionId:
      rampResponse.data?.connected && rampResponse.data.connectionId
        ? rampResponse.data.connectionId
        : null,
    selectedProvider: selectedProviderSlug,
    lastSyncAt: selectedSyncTimes?.lastSyncAt ? new Date(selectedSyncTimes.lastSyncAt) : null,
    nextSyncAt: selectedSyncTimes?.nextSyncAt ? new Date(selectedSyncTimes.nextSyncAt) : null,
    availableProviders,
  };
}
