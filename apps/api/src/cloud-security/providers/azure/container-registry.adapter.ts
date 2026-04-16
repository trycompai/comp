import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface ContainerRegistry {
  id: string;
  name: string;
  location: string;
  sku: { name: string; tier: string };
  properties: {
    adminUserEnabled?: boolean;
    publicNetworkAccess?: string;
    networkRuleSet?: {
      defaultAction: string;
    };
    encryption?: {
      status: string;
      keyVaultProperties?: unknown;
    };
    policies?: {
      trustPolicy?: { status: string; type?: string };
      retentionPolicy?: { status: string; days?: number };
      quarantinePolicy?: { status: string };
    };
    anonymousPullEnabled?: boolean;
  };
}

export class ContainerRegistryAdapter implements AzureServiceAdapter {
  readonly serviceId = 'container-registry';

  async scan({
    accessToken,
    subscriptionId,
  }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const registries = await fetchAllPages<ContainerRegistry>(
      accessToken,
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.ContainerRegistry/registries?api-version=2023-11-01-preview`,
    );

    if (registries.length === 0) return findings;

    for (const reg of registries) {
      const props = reg.properties;

      // Check 1: Admin user
      if (props.adminUserEnabled === true) {
        findings.push(
          this.finding(reg, {
            key: 'admin-enabled',
            title: `Admin User Enabled: ${reg.name}`,
            description: `Container Registry "${reg.name}" has the admin user enabled. Use service principals or managed identities instead.`,
            severity: 'high',
            remediation:
              'Disable the admin user and use Azure AD service principals or managed identities for authentication.',
          }),
        );
      }

      // Check 2: Public network access
      const isPublic =
        props.publicNetworkAccess !== 'Disabled' &&
        props.networkRuleSet?.defaultAction !== 'Deny';
      if (isPublic) {
        findings.push(
          this.finding(reg, {
            key: 'public-access',
            title: `Public Network Access: ${reg.name}`,
            description: `Container Registry "${reg.name}" is publicly accessible. Restrict to private endpoints or specific networks.`,
            severity: 'medium',
            remediation:
              'Disable public network access and use private endpoints. Requires Premium SKU.',
          }),
        );
      }

      // Check 3: Content trust (image signing)
      if (props.policies?.trustPolicy?.status !== 'enabled') {
        findings.push(
          this.finding(reg, {
            key: 'no-content-trust',
            title: `Content Trust Disabled: ${reg.name}`,
            description: `Container Registry "${reg.name}" does not have content trust enabled. Images are not verified for integrity.`,
            severity: 'medium',
            remediation:
              'Enable content trust policy to require signed images. Requires Premium SKU.',
          }),
        );
      }

      // Check 4: Anonymous pull
      if (props.anonymousPullEnabled === true) {
        findings.push(
          this.finding(reg, {
            key: 'anonymous-pull',
            title: `Anonymous Pull Enabled: ${reg.name}`,
            description: `Container Registry "${reg.name}" allows anonymous (unauthenticated) image pulls.`,
            severity: 'medium',
            remediation:
              'Disable anonymous pull unless the registry is intentionally public.',
          }),
        );
      }

      // Check 5: Retention policy
      if (props.policies?.retentionPolicy?.status !== 'enabled') {
        findings.push(
          this.finding(reg, {
            key: 'no-retention',
            title: `No Retention Policy: ${reg.name}`,
            description: `Container Registry "${reg.name}" has no retention policy for untagged manifests. Old images accumulate without cleanup.`,
            severity: 'low',
            remediation:
              'Enable a retention policy to automatically purge untagged manifests. Requires Premium SKU.',
          }),
        );
      }
    }

    if (findings.length === 0) {
      findings.push({
        id: `azure-acr-ok-${subscriptionId}`,
        title: 'Container Registry Security',
        description: `All ${registries.length} container registr(ies) are properly configured.`,
        severity: 'info',
        resourceType: 'container-registry',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: {
          serviceId: this.serviceId,
          serviceName: 'Container Registry',
          findingKey: 'azure-container-registry-all-ok',
        },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    return findings;
  }

  private finding(
    reg: ContainerRegistry,
    opts: {
      key: string;
      title: string;
      description: string;
      severity: SecurityFinding['severity'];
      remediation: string;
    },
  ): SecurityFinding {
    return {
      id: `azure-acr-${opts.key}-${reg.name}`,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'container-registry',
      resourceId: reg.id,
      remediation: opts.remediation,
      evidence: {
        serviceId: this.serviceId,
        serviceName: 'Container Registry',
        findingKey: `azure-container-registry-${opts.key}`,
        registryName: reg.name,
        sku: reg.sku.name,
        location: reg.location,
      },
      createdAt: new Date().toISOString(),
    };
  }
}
