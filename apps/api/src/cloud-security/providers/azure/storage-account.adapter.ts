import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface StorageAccount {
  id: string;
  name: string;
  location: string;
  properties: {
    supportsHttpsTrafficOnly?: boolean;
    minimumTlsVersion?: string;
    allowBlobPublicAccess?: boolean;
    encryption?: {
      services?: {
        blob?: { enabled: boolean };
        file?: { enabled: boolean };
      };
      keySource?: string;
    };
    networkAcls?: {
      defaultAction: string;
      bypass: string;
    };
    publicNetworkAccess?: string;
  };
}

export class StorageAccountAdapter implements AzureServiceAdapter {
  readonly serviceId = 'storage-account';

  async scan({ accessToken, subscriptionId }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const accounts = await fetchAllPages<StorageAccount>(
      accessToken,
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Storage/storageAccounts?api-version=2023-05-01`,
    );

    if (accounts.length === 0) return findings;

    for (const acct of accounts) {
      const props = acct.properties;

      // Check 1: HTTPS-only
      if (props.supportsHttpsTrafficOnly === false) {
        findings.push(this.finding(acct, {
          key: 'https-disabled',
          title: `HTTPS Not Enforced: ${acct.name}`,
          description: `Storage account "${acct.name}" allows insecure HTTP traffic.`,
          severity: 'high',
          remediation: 'Enable "Secure transfer required" to enforce HTTPS-only access.',
        }));
      }

      // Check 2: TLS version
      if (!props.minimumTlsVersion || props.minimumTlsVersion < 'TLS1_2') {
        findings.push(this.finding(acct, {
          key: 'tls-outdated',
          title: `Outdated TLS Version: ${acct.name}`,
          description: `Storage account "${acct.name}" allows TLS versions below 1.2 (current: ${props.minimumTlsVersion || 'not set'}).`,
          severity: 'medium',
          remediation: 'Set minimum TLS version to TLS 1.2.',
        }));
      }

      // Check 3: Public blob access
      if (props.allowBlobPublicAccess === true) {
        findings.push(this.finding(acct, {
          key: 'public-blob',
          title: `Public Blob Access Enabled: ${acct.name}`,
          description: `Storage account "${acct.name}" allows anonymous public access to blobs. This can expose sensitive data.`,
          severity: 'high',
          remediation: 'Disable "Allow Blob public access" unless explicitly required.',
        }));
      }

      // Check 4: Network access
      const isPublic = props.publicNetworkAccess === 'Enabled'
        || props.networkAcls?.defaultAction === 'Allow';
      if (isPublic) {
        findings.push(this.finding(acct, {
          key: 'public-network',
          title: `Public Network Access: ${acct.name}`,
          description: `Storage account "${acct.name}" allows access from all networks. Restrict to specific VNets or IP ranges.`,
          severity: 'medium',
          remediation: 'Configure network ACLs to deny public access and add specific VNet/IP rules.',
        }));
      }

      // Check 5: Encryption
      const blobEncrypted = props.encryption?.services?.blob?.enabled !== false;
      const fileEncrypted = props.encryption?.services?.file?.enabled !== false;
      if (!blobEncrypted || !fileEncrypted) {
        findings.push(this.finding(acct, {
          key: 'encryption-disabled',
          title: `Encryption Not Fully Enabled: ${acct.name}`,
          description: `Storage account "${acct.name}" does not have encryption enabled for all services.`,
          severity: 'high',
          remediation: 'Enable encryption for blob and file services.',
        }));
      }
    }

    if (findings.length === 0) {
      findings.push({
        id: `azure-storage-ok-${subscriptionId}`,
        title: 'Storage Account Security',
        description: `All ${accounts.length} storage account(s) are properly configured.`,
        severity: 'info',
        resourceType: 'storage-account',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: { serviceId: this.serviceId, serviceName: 'Storage Accounts', findingKey: 'azure-storage-account-all-ok' },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    return findings;
  }

  private finding(acct: StorageAccount, opts: {
    key: string; title: string; description: string;
    severity: SecurityFinding['severity']; remediation: string;
  }): SecurityFinding {
    return {
      id: `azure-sa-${opts.key}-${acct.name}`,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'storage-account',
      resourceId: acct.id,
      remediation: opts.remediation,
      evidence: {
        serviceId: this.serviceId,
        serviceName: 'Storage Accounts',
        findingKey: `azure-storage-account-${opts.key}`,
        accountName: acct.name,
        location: acct.location,
      },
      createdAt: new Date().toISOString(),
    };
  }
}
