import { serverApi } from '@/lib/server-api-client';

export interface EmployeeSyncConnectionsData {
  googleWorkspaceConnectionId: string | null;
  ripplingConnectionId: string | null;
  selectedProvider: 'google-workspace' | 'rippling' | null;
}

interface ConnectionStatus {
  connected: boolean;
  connectionId: string | null;
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

  return {
    googleWorkspaceConnectionId:
      gwResponse.data?.connected && gwResponse.data.connectionId
        ? gwResponse.data.connectionId
        : null,
    ripplingConnectionId:
      ripplingResponse.data?.connected && ripplingResponse.data.connectionId
        ? ripplingResponse.data.connectionId
        : null,
    selectedProvider: providerResponse.data?.provider ?? null,
  };
}
