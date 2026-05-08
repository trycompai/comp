import type { SecurityFinding } from '../../cloud-security.service';

export interface AzureServiceAdapter {
  /** Must match the manifest service ID (e.g. 'defender', 'entra-id') */
  readonly serviceId: string;
  scan(params: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]>;
}

/** Shared pagination helper for Azure ARM list APIs. */
export async function fetchAllPages<T>(
  accessToken: string,
  initialUrl: string,
): Promise<T[]> {
  const results: T[] = [];
  let url: string | undefined = initialUrl;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as { value: T[]; nextLink?: string };
    results.push(...data.value);
    url = data.nextLink;
  }

  return results;
}

/** Map Defender assessment categories → our service IDs. */
export const AZURE_CATEGORY_TO_SERVICE: Record<string, string> = {
  // Identity & Access
  'Identity and Access': 'entra-id',
  IdentityAndAccess: 'entra-id',
  // Network
  Networking: 'network-watcher',
  Network: 'network-watcher',
  // Data
  Data: 'key-vault',
  'Data Protection': 'key-vault',
  Encryption: 'key-vault',
  // Compute
  Compute: 'defender',
  Container: 'defender',
  AppServices: 'defender',
  // Governance
  'Regulatory Compliance': 'policy',
  Governance: 'policy',
  // Monitoring
  'Logging and Threat Detection': 'monitor',
  IoT: 'defender',
  API: 'defender',
};

/** Human-readable service names for UI grouping. */
export const AZURE_SERVICE_NAMES: Record<string, string> = {
  defender: 'Microsoft Defender',
  'entra-id': 'Entra ID',
  policy: 'Azure Policy',
  'key-vault': 'Key Vault',
  monitor: 'Azure Monitor',
  'network-watcher': 'Network Watcher',
  'storage-account': 'Storage Accounts',
  'sql-database': 'SQL Database',
  'virtual-machine': 'Virtual Machines',
  'app-service': 'App Service',
  aks: 'AKS',
  'container-registry': 'Container Registry',
  'cosmos-db': 'Cosmos DB',
};
