import { serverApi } from '@/lib/server-api-client';

export interface EmployeeSyncConnectionsData {
  googleWorkspaceConnectionId: string | null;
  ripplingConnectionId: string | null;
  selectedProvider: 'google-workspace' | 'rippling' | null;
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
  const [gwResponse, ripplingResponse, providerResponse] = await Promise.all([
    serverApi.post<ConnectionStatus>(
      `/v1/integrations/sync/google-workspace/status?organizationId=${organizationId}`,
    ),
    serverApi.post<ConnectionStatus>(
      `/v1/integrations/sync/rippling/status?organizationId=${organizationId}`,
    ),
    serverApi.get<{ provider: 'google-workspace' | 'rippling' | null }>(
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
    selectedProvider: selectedProviderSlug,
    lastSyncAt: selectedConnection?.lastSyncAt
      ? new Date(selectedConnection.lastSyncAt)
      : null,
    nextSyncAt: selectedConnection?.nextSyncAt
      ? new Date(selectedConnection.nextSyncAt)
      : null,
  };
}
