import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface KeyVault {
  id: string;
  name: string;
  location: string;
  properties: {
    enableSoftDelete?: boolean;
    enablePurgeProtection?: boolean;
    enableRbacAuthorization?: boolean;
    publicNetworkAccess?: string;
    networkAcls?: {
      defaultAction: string;
      bypass: string;
    };
    vaultUri: string;
  };
}

export class KeyVaultAdapter implements AzureServiceAdapter {
  readonly serviceId = 'key-vault';

  async scan({ accessToken, subscriptionId }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const baseUrl = 'https://management.azure.com';

    const vaults = await fetchAllPages<KeyVault>(
      accessToken,
      `${baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.KeyVault/vaults?api-version=2023-07-01`,
    );

    if (vaults.length === 0) return findings;

    for (const vault of vaults) {
      const props = vault.properties;

      // Check 1: Soft delete
      if (!props.enableSoftDelete) {
        findings.push(this.finding(vault, {
          key: 'soft-delete-disabled',
          title: `Key Vault Soft Delete Disabled: ${vault.name}`,
          description: `Key Vault "${vault.name}" does not have soft delete enabled. Deleted keys/secrets cannot be recovered.`,
          severity: 'high',
          remediation: 'Enable soft delete on the Key Vault to allow recovery of deleted items.',
        }));
      }

      // Check 2: Purge protection
      if (!props.enablePurgeProtection) {
        findings.push(this.finding(vault, {
          key: 'purge-protection-disabled',
          title: `Key Vault Purge Protection Disabled: ${vault.name}`,
          description: `Key Vault "${vault.name}" does not have purge protection. Deleted items can be permanently removed before the retention period.`,
          severity: 'medium',
          remediation: 'Enable purge protection to prevent permanent deletion during the retention period.',
        }));
      }

      // Check 3: Public network access
      const isPublic = props.publicNetworkAccess === 'Enabled'
        || props.networkAcls?.defaultAction === 'Allow';
      if (isPublic) {
        findings.push(this.finding(vault, {
          key: 'public-access',
          title: `Key Vault Publicly Accessible: ${vault.name}`,
          description: `Key Vault "${vault.name}" allows public network access. Restrict to private endpoints or specific networks.`,
          severity: 'high',
          remediation: 'Configure network ACLs to deny public access and use private endpoints.',
        }));
      }

      // Check 4: RBAC vs access policies
      if (!props.enableRbacAuthorization) {
        findings.push(this.finding(vault, {
          key: 'no-rbac',
          title: `Key Vault Using Legacy Access Policies: ${vault.name}`,
          description: `Key Vault "${vault.name}" uses vault access policies instead of Azure RBAC. RBAC provides finer-grained, auditable access control.`,
          severity: 'low',
          remediation: 'Migrate to Azure RBAC permission model for better access control.',
        }));
      }
    }

    // Passing check if all vaults are well-configured
    const failCount = findings.length;
    if (failCount === 0) {
      findings.push({
        id: `azure-key-vault-ok-${subscriptionId}`,
        title: 'Key Vault Configuration',
        description: `All ${vaults.length} Key Vault(s) are properly configured.`,
        severity: 'info',
        resourceType: 'key-vault',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: { serviceId: this.serviceId, serviceName: 'Key Vault', findingKey: 'azure-key-vault-all-ok' },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    return findings;
  }

  private finding(vault: KeyVault, opts: {
    key: string; title: string; description: string;
    severity: SecurityFinding['severity']; remediation: string;
  }): SecurityFinding {
    return {
      id: `azure-kv-${opts.key}-${vault.name}`,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'key-vault',
      resourceId: vault.id,
      remediation: opts.remediation,
      evidence: {
        serviceId: this.serviceId,
        serviceName: 'Key Vault',
        findingKey: `azure-key-vault-${opts.key}`,
        vaultName: vault.name,
        location: vault.location,
      },
      createdAt: new Date().toISOString(),
    };
  }
}
