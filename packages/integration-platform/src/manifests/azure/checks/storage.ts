import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { ARM_BASE, armListAll, resolveAzureSubscriptionId } from './shared';

interface StorageAccount {
  id: string;
  name: string;
  properties?: {
    supportsHttpsTrafficOnly?: boolean;
    minimumTlsVersion?: string;
    allowBlobPublicAccess?: boolean;
    publicNetworkAccess?: string;
    networkAcls?: { defaultAction?: string };
    encryption?: {
      services?: {
        blob?: { enabled?: boolean };
        file?: { enabled?: boolean };
      };
    };
  };
}

async function listStorageAccounts(
  ctx: CheckContext,
  sub: string,
): Promise<StorageAccount[]> {
  return armListAll<StorageAccount>(
    ctx,
    `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Storage/storageAccounts?api-version=2023-05-01`,
  );
}

/** HTTPS-only + minimum TLS 1.2 on storage accounts → TLS / HTTPS. */
export const storageHttpsTlsCheck: IntegrationCheck = {
  id: 'azure-storage-https-tls',
  name: 'Storage — HTTPS and TLS 1.2 enforced',
  description:
    'Verify storage accounts enforce HTTPS-only traffic and a minimum TLS version of 1.2.',
  service: 'storage-account',
  taskMapping: TASK_TEMPLATES.tlsHttps,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const accounts = await listStorageAccounts(ctx, sub);
    if (accounts.length === 0) return;
    for (const a of accounts) {
      const p = a.properties ?? {};
      const issues: string[] = [];
      if (p.supportsHttpsTrafficOnly === false) issues.push('HTTPS not enforced');
      if (!p.minimumTlsVersion || p.minimumTlsVersion < 'TLS1_2') {
        issues.push(`minimum TLS ${p.minimumTlsVersion ?? 'unset'}`);
      }
      if (issues.length > 0) {
        ctx.fail({
          title: `Weak transit encryption: ${a.name}`,
          description: `Storage account "${a.name}": ${issues.join('; ')}.`,
          resourceType: 'azure-storage-account',
          resourceId: a.id,
          severity: p.supportsHttpsTrafficOnly === false ? 'high' : 'medium',
          remediation:
            'Enable "Secure transfer required" (HTTPS-only) and set minimum TLS version to 1.2.',
          evidence: {
            account: a.name,
            supportsHttpsTrafficOnly: p.supportsHttpsTrafficOnly,
            minimumTlsVersion: p.minimumTlsVersion ?? null,
          },
        });
      } else {
        ctx.pass({
          title: `HTTPS + TLS 1.2 enforced: ${a.name}`,
          description: `Storage account "${a.name}" enforces HTTPS-only and TLS >= 1.2.`,
          resourceType: 'azure-storage-account',
          resourceId: a.id,
          evidence: { account: a.name, minimumTlsVersion: p.minimumTlsVersion },
        });
      }
    }
  },
};

/** No public blob/network access on storage accounts → Production Firewall / no public access. */
export const storagePublicAccessCheck: IntegrationCheck = {
  id: 'azure-storage-no-public-access',
  name: 'Storage — no public access',
  description:
    'Verify storage accounts disable anonymous blob access and public network access.',
  service: 'storage-account',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const accounts = await listStorageAccounts(ctx, sub);
    if (accounts.length === 0) return;
    for (const a of accounts) {
      const p = a.properties ?? {};
      const publicBlob = p.allowBlobPublicAccess === true;
      // publicNetworkAccess 'Disabled' or 'SecuredByPerimeter' (network security
      // perimeter) overrides the firewall default action and is not public.
      const networkRestricted =
        p.publicNetworkAccess === 'Disabled' ||
        p.publicNetworkAccess === 'SecuredByPerimeter';
      const publicNetwork =
        !networkRestricted &&
        (p.publicNetworkAccess === 'Enabled' ||
          p.networkAcls?.defaultAction === 'Allow');
      if (publicBlob || publicNetwork) {
        ctx.fail({
          title: `Public access enabled: ${a.name}`,
          description: `Storage account "${a.name}"${publicBlob ? ' allows anonymous blob access' : ''}${publicBlob && publicNetwork ? ' and' : ''}${publicNetwork ? ' allows access from all networks' : ''}.`,
          resourceType: 'azure-storage-account',
          resourceId: a.id,
          severity: publicBlob ? 'high' : 'medium',
          remediation:
            'Disable "Allow Blob public access" and restrict network access to specific VNets/IPs or private endpoints.',
          evidence: {
            account: a.name,
            allowBlobPublicAccess: p.allowBlobPublicAccess,
            publicNetworkAccess: p.publicNetworkAccess ?? null,
          },
        });
      } else {
        ctx.pass({
          title: `No public access: ${a.name}`,
          description: `Storage account "${a.name}" blocks anonymous blob and public network access.`,
          resourceType: 'azure-storage-account',
          resourceId: a.id,
          evidence: { account: a.name },
        });
      }
    }
  },
};

/** Service-side encryption enabled on storage accounts → Encryption at Rest. */
export const storageEncryptionCheck: IntegrationCheck = {
  id: 'azure-storage-encryption-at-rest',
  name: 'Storage — encryption at rest enabled',
  description:
    'Verify storage accounts have blob and file service encryption enabled.',
  service: 'storage-account',
  taskMapping: TASK_TEMPLATES.encryptionAtRest,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const accounts = await listStorageAccounts(ctx, sub);
    if (accounts.length === 0) return;
    for (const a of accounts) {
      const enc = a.properties?.encryption?.services;
      const blobOk = enc?.blob?.enabled !== false;
      const fileOk = enc?.file?.enabled !== false;
      if (blobOk && fileOk) {
        ctx.pass({
          title: `Encryption at rest enabled: ${a.name}`,
          description: `Storage account "${a.name}" has blob and file encryption enabled.`,
          resourceType: 'azure-storage-account',
          resourceId: a.id,
          evidence: { account: a.name },
        });
      } else {
        ctx.fail({
          title: `Encryption not fully enabled: ${a.name}`,
          description: `Storage account "${a.name}" does not have encryption enabled for all services.`,
          resourceType: 'azure-storage-account',
          resourceId: a.id,
          severity: 'high',
          remediation: 'Enable encryption for blob and file services.',
          evidence: { account: a.name, blobEnabled: blobOk, fileEnabled: fileOk },
        });
      }
    }
  },
};
