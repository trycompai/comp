import { serverApi } from '@/lib/server-api-client';

export interface EmployeeSyncConnectionsData {
  googleWorkspaceConnectionId: string | null;
  ripplingConnectionId: string | null;
  jumpcloudConnectionId: string | null;
  selectedProvider: 'google-workspace' | 'rippling' | 'jumpcloud' | null | undefined;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
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
  const [gwResponse, ripplingResponse, jumpcloudResponse, providerResponse] = await Promise.all([
    serverApi.post<ConnectionStatus>(
      `/v1/integrations/sync/google-workspace/status?organizationId=${organizationId}`,
    ),
    serverApi.post<ConnectionStatus>(
      `/v1/integrations/sync/rippling/status?organizationId=${organizationId}`,
    ),
    serverApi.post<ConnectionStatus>(
      `/v1/integrations/sync/jumpcloud/status?organizationId=${organizationId}`,
    ),
    serverApi.get<{ provider: 'google-workspace' | 'rippling' | 'jumpcloud' | null }>(
      `/v1/integrations/sync/employee-sync-provider?organizationId=${organizationId}`,
    ),
  ]);

  // Get sync times from the selected provider's connection
  const selectedProviderSlug = providerResponse.data?.provider;
  const selectedConnection =
    selectedProviderSlug === 'google-workspace'
      ? gwResponse.data
      : selectedProviderSlug === 'rippling'
        ? ripplingResponse.data
        : selectedProviderSlug === 'jumpcloud'
          ? jumpcloudResponse.data
          : null;

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
    selectedProvider: selectedProviderSlug,
    lastSyncAt: selectedConnection?.lastSyncAt ? new Date(selectedConnection.lastSyncAt) : null,
    nextSyncAt: selectedConnection?.nextSyncAt ? new Date(selectedConnection.nextSyncAt) : null,
  };
}
