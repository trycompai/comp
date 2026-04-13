import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface CosmosDbAccount {
  id: string;
  name: string;
  location: string;
  properties: {
    publicNetworkAccess?: string;
    isVirtualNetworkFilterEnabled?: boolean;
    ipRules?: Array<{ ipAddressOrRange: string }>;
    disableKeyBasedMetadataWriteAccess?: boolean;
    enableAutomaticFailover?: boolean;
    enableMultipleWriteLocations?: boolean;
    disableLocalAuth?: boolean;
    networkAclBypass?: string;
    minimalTlsVersion?: string;
    backupPolicy?: {
      type: string; // 'Periodic' | 'Continuous'
      periodicModeProperties?: {
        backupIntervalInMinutes?: number;
        backupRetentionIntervalInHours?: number;
      };
    };
  };
}

export class CosmosDbAdapter implements AzureServiceAdapter {
  readonly serviceId = 'cosmos-db';

  async scan({ accessToken, subscriptionId }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const accounts = await fetchAllPages<CosmosDbAccount>(
      accessToken,
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.DocumentDB/databaseAccounts?api-version=2024-02-15-preview`,
    );

    if (accounts.length === 0) return findings;

    for (const acct of accounts) {
      const props = acct.properties;

      // Check 1: Public network access
      const hasIpRules = (props.ipRules?.length ?? 0) > 0;
      const hasVnetFilter = props.isVirtualNetworkFilterEnabled === true;
      if (props.publicNetworkAccess !== 'Disabled' && !hasIpRules && !hasVnetFilter) {
        findings.push(this.finding(acct, {
          key: 'public-unrestricted',
          title: `Public Access Unrestricted: ${acct.name}`,
          description: `Cosmos DB account "${acct.name}" is publicly accessible without IP or VNet restrictions.`,
          severity: 'high',
          remediation: 'Disable public network access or add IP rules / VNet service endpoints.',
        }));
      }

      // Check 2: Local auth (key-based)
      if (props.disableLocalAuth !== true) {
        findings.push(this.finding(acct, {
          key: 'local-auth-enabled',
          title: `Key-Based Auth Enabled: ${acct.name}`,
          description: `Cosmos DB account "${acct.name}" allows key-based authentication. Use Azure AD authentication for better security and auditing.`,
          severity: 'medium',
          remediation: 'Disable local authentication and use Azure AD RBAC for data plane access.',
        }));
      }

      // Check 3: Automatic failover
      if (props.enableAutomaticFailover !== true) {
        findings.push(this.finding(acct, {
          key: 'no-auto-failover',
          title: `Automatic Failover Disabled: ${acct.name}`,
          description: `Cosmos DB account "${acct.name}" does not have automatic failover enabled. Manual intervention required during regional outages.`,
          severity: 'low',
          remediation: 'Enable automatic failover for high availability.',
        }));
      }

      // Check 4: Backup policy
      const backup = props.backupPolicy;
      if (backup?.type === 'Periodic') {
        const retention = backup.periodicModeProperties?.backupRetentionIntervalInHours ?? 0;
        if (retention < 24) {
          findings.push(this.finding(acct, {
            key: 'low-backup-retention',
            title: `Low Backup Retention: ${acct.name}`,
            description: `Cosmos DB account "${acct.name}" has backup retention of only ${retention} hours. Consider increasing for disaster recovery.`,
            severity: 'medium',
            remediation: 'Increase backup retention or switch to continuous backup mode.',
          }));
        }
      }

      // Check 5: Metadata write access
      if (props.disableKeyBasedMetadataWriteAccess !== true) {
        findings.push(this.finding(acct, {
          key: 'metadata-write-enabled',
          title: `Key-Based Metadata Write Enabled: ${acct.name}`,
          description: `Cosmos DB account "${acct.name}" allows key-based metadata write access. This means account keys can modify database resources (create/delete databases, containers).`,
          severity: 'low',
          remediation: 'Disable key-based metadata write access to prevent accidental resource modification via account keys.',
        }));
      }
    }

    if (findings.length === 0) {
      findings.push({
        id: `azure-cosmos-ok-${subscriptionId}`,
        title: 'Cosmos DB Security',
        description: `All ${accounts.length} Cosmos DB account(s) are properly configured.`,
        severity: 'info',
        resourceType: 'cosmos-db',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: { serviceId: this.serviceId, serviceName: 'Cosmos DB', findingKey: 'azure-cosmos-db-all-ok' },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    return findings;
  }

  private finding(acct: CosmosDbAccount, opts: {
    key: string; title: string; description: string;
    severity: SecurityFinding['severity']; remediation: string;
  }): SecurityFinding {
    return {
      id: `azure-cosmos-${opts.key}-${acct.name}`,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'cosmos-db',
      resourceId: acct.id,
      remediation: opts.remediation,
      evidence: {
        serviceId: this.serviceId,
        serviceName: 'Cosmos DB',
        findingKey: `azure-cosmos-db-${opts.key}`,
        accountName: acct.name,
        location: acct.location,
      },
      createdAt: new Date().toISOString(),
    };
  }
}
