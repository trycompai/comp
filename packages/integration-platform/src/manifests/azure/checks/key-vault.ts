import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, FindingSeverity, IntegrationCheck } from '../../../types';
import { ARM_BASE, armListAll, resolveAzureSubscriptionId } from './shared';

interface KeyVault {
  id: string;
  name: string;
  properties?: {
    enableSoftDelete?: boolean;
    enablePurgeProtection?: boolean;
    enableRbacAuthorization?: boolean;
    publicNetworkAccess?: string;
    networkAcls?: { defaultAction?: string };
  };
}

async function listVaults(ctx: CheckContext, sub: string): Promise<KeyVault[]> {
  return armListAll<KeyVault>(
    ctx,
    `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.KeyVault/vaults?api-version=2023-07-01`,
  );
}

/** Soft delete + purge protection + no public access on Key Vaults → Secure Secrets. */
export const keyVaultProtectionCheck: IntegrationCheck = {
  id: 'azure-key-vault-protection',
  name: 'Key Vault — soft delete, purge protection, no public access',
  description:
    'Verify Key Vaults enable soft delete and purge protection and restrict public network access.',
  service: 'key-vault',
  taskMapping: TASK_TEMPLATES.secureSecrets,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const vaults = await listVaults(ctx, sub);
    if (vaults.length === 0) return;
    for (const v of vaults) {
      const p = v.properties ?? {};
      const issues: string[] = [];
      let severity: FindingSeverity = 'medium';
      if (!p.enableSoftDelete) {
        issues.push('soft delete disabled');
        severity = 'high';
      }
      if (!p.enablePurgeProtection) issues.push('purge protection disabled');
      const isPublic =
        p.publicNetworkAccess !== 'Disabled' &&
        (p.publicNetworkAccess === 'Enabled' ||
          p.networkAcls?.defaultAction === 'Allow');
      if (isPublic) {
        issues.push('public network access');
        severity = 'high';
      }
      if (issues.length > 0) {
        ctx.fail({
          title: `Key Vault not fully protected: ${v.name}`,
          description: `Key Vault "${v.name}": ${issues.join('; ')}.`,
          resourceType: 'azure-key-vault',
          resourceId: v.id,
          severity,
          remediation:
            'Enable soft delete and purge protection, and restrict public network access (use private endpoints).',
          evidence: {
            vault: v.name,
            enableSoftDelete: p.enableSoftDelete,
            enablePurgeProtection: p.enablePurgeProtection,
            publicNetworkAccess: p.publicNetworkAccess ?? null,
          },
        });
      } else {
        ctx.pass({
          title: `Key Vault protected: ${v.name}`,
          description: `Key Vault "${v.name}" has soft delete + purge protection and restricts public access.`,
          resourceType: 'azure-key-vault',
          resourceId: v.id,
          evidence: { vault: v.name },
        });
      }
    }
  },
};

/** Azure RBAC authorization (not legacy access policies) on Key Vaults → Role-based Access Controls. */
export const keyVaultRbacCheck: IntegrationCheck = {
  id: 'azure-key-vault-rbac',
  name: 'Key Vault — RBAC authorization',
  description:
    'Verify Key Vaults use Azure RBAC instead of legacy vault access policies.',
  service: 'key-vault',
  taskMapping: TASK_TEMPLATES.rolebasedAccessControls,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const vaults = await listVaults(ctx, sub);
    if (vaults.length === 0) return;
    for (const v of vaults) {
      if (v.properties?.enableRbacAuthorization) {
        ctx.pass({
          title: `RBAC authorization enabled: ${v.name}`,
          description: `Key Vault "${v.name}" uses Azure RBAC for access control.`,
          resourceType: 'azure-key-vault',
          resourceId: v.id,
          evidence: { vault: v.name },
        });
      } else {
        ctx.fail({
          title: `Legacy access policies: ${v.name}`,
          description: `Key Vault "${v.name}" uses vault access policies instead of Azure RBAC.`,
          resourceType: 'azure-key-vault',
          resourceId: v.id,
          severity: 'low',
          remediation:
            'Migrate to the Azure RBAC permission model for finer-grained, auditable access control.',
          evidence: { vault: v.name },
        });
      }
    }
  },
};
