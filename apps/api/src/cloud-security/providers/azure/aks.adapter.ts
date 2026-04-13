import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface AksCluster {
  id: string;
  name: string;
  location: string;
  properties: {
    kubernetesVersion?: string;
    enableRBAC?: boolean;
    aadProfile?: {
      managed?: boolean;
      enableAzureRBAC?: boolean;
    };
    apiServerAccessProfile?: {
      authorizedIPRanges?: string[];
      enablePrivateCluster?: boolean;
    };
    networkProfile?: {
      networkPolicy?: string; // 'azure' | 'calico' | null
      outboundType?: string;
    };
    addonProfiles?: {
      azurePolicy?: { enabled: boolean };
      omsagent?: { enabled: boolean };
    };
    autoUpgradeProfile?: {
      upgradeChannel?: string; // 'none' | 'patch' | 'rapid' | 'stable' | 'node-image'
    };
  };
}

export class AksAdapter implements AzureServiceAdapter {
  readonly serviceId = 'aks';

  async scan({ accessToken, subscriptionId }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const clusters = await fetchAllPages<AksCluster>(
      accessToken,
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.ContainerService/managedClusters?api-version=2024-01-01`,
    );

    if (clusters.length === 0) return findings;

    for (const cluster of clusters) {
      const props = cluster.properties;

      // Check 1: Kubernetes RBAC
      if (props.enableRBAC !== true) {
        findings.push(this.finding(cluster, {
          key: 'rbac-disabled',
          title: `Kubernetes RBAC Disabled: ${cluster.name}`,
          description: `AKS cluster "${cluster.name}" does not have Kubernetes RBAC enabled. All users have full access to all resources.`,
          severity: 'critical',
          remediation: 'Enable Kubernetes RBAC. Note: this requires cluster recreation for existing clusters.',
        }));
      }

      // Check 2: Azure AD integration
      if (!props.aadProfile?.managed) {
        findings.push(this.finding(cluster, {
          key: 'no-aad-integration',
          title: `No Azure AD Integration: ${cluster.name}`,
          description: `AKS cluster "${cluster.name}" is not integrated with Azure AD. Use Azure AD for centralized identity management.`,
          severity: 'medium',
          remediation: 'Enable managed Azure AD integration on the cluster.',
        }));
      }

      // Check 3: Network policy
      if (!props.networkProfile?.networkPolicy) {
        findings.push(this.finding(cluster, {
          key: 'no-network-policy',
          title: `No Network Policy: ${cluster.name}`,
          description: `AKS cluster "${cluster.name}" has no network policy plugin configured. All pods can communicate with each other without restriction.`,
          severity: 'high',
          remediation: 'Enable Azure or Calico network policy plugin. Note: requires cluster recreation.',
        }));
      }

      // Check 4: Private cluster / API server access
      const apiAccess = props.apiServerAccessProfile;
      if (!apiAccess?.enablePrivateCluster && (!apiAccess?.authorizedIPRanges || apiAccess.authorizedIPRanges.length === 0)) {
        findings.push(this.finding(cluster, {
          key: 'api-server-public',
          title: `API Server Publicly Accessible: ${cluster.name}`,
          description: `AKS cluster "${cluster.name}" API server is accessible from the internet without IP restrictions.`,
          severity: 'high',
          remediation: 'Enable private cluster or configure authorized IP ranges for the API server.',
        }));
      }

      // Check 5: Azure Policy addon
      if (!props.addonProfiles?.azurePolicy?.enabled) {
        findings.push(this.finding(cluster, {
          key: 'no-azure-policy',
          title: `Azure Policy Not Enabled: ${cluster.name}`,
          description: `AKS cluster "${cluster.name}" does not have the Azure Policy addon enabled for Kubernetes governance.`,
          severity: 'low',
          remediation: 'Enable the Azure Policy addon on the cluster.',
        }));
      }

      // Check 6: Auto-upgrade
      const upgradeChannel = props.autoUpgradeProfile?.upgradeChannel;
      if (!upgradeChannel || upgradeChannel === 'none') {
        findings.push(this.finding(cluster, {
          key: 'no-auto-upgrade',
          title: `Auto-Upgrade Disabled: ${cluster.name}`,
          description: `AKS cluster "${cluster.name}" does not have auto-upgrade configured. Clusters may fall behind on security patches.`,
          severity: 'medium',
          remediation: 'Set auto-upgrade channel to "patch" or "stable" for automatic security updates.',
        }));
      }

      // Check 7: Monitoring
      if (!props.addonProfiles?.omsagent?.enabled) {
        findings.push(this.finding(cluster, {
          key: 'no-monitoring',
          title: `Container Monitoring Disabled: ${cluster.name}`,
          description: `AKS cluster "${cluster.name}" does not have Container Insights (OMS agent) enabled.`,
          severity: 'medium',
          remediation: 'Enable the monitoring addon to collect container logs and metrics.',
        }));
      }
    }

    if (findings.length === 0) {
      findings.push({
        id: `azure-aks-ok-${subscriptionId}`,
        title: 'AKS Cluster Security',
        description: `All ${clusters.length} AKS cluster(s) are properly configured.`,
        severity: 'info',
        resourceType: 'aks',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: { serviceId: this.serviceId, serviceName: 'AKS', findingKey: 'azure-aks-all-ok' },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    return findings;
  }

  private finding(cluster: AksCluster, opts: {
    key: string; title: string; description: string;
    severity: SecurityFinding['severity']; remediation: string;
  }): SecurityFinding {
    return {
      id: `azure-aks-${opts.key}-${cluster.name}`,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'aks',
      resourceId: cluster.id,
      remediation: opts.remediation,
      evidence: {
        serviceId: this.serviceId,
        serviceName: 'AKS',
        findingKey: `azure-aks-${opts.key}`,
        clusterName: cluster.name,
        location: cluster.location,
        kubernetesVersion: cluster.properties.kubernetesVersion,
      },
      createdAt: new Date().toISOString(),
    };
  }
}
