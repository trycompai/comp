import type { IntegrationManifest } from '../../types';

export const azureManifest: IntegrationManifest = {
  id: 'azure',
  name: 'Microsoft Azure',
  description:
    'Read-only monitoring of security posture, identity, network, and compliance in Microsoft Azure',
  category: 'Cloud',
  logoUrl:
    'https://img.logo.dev/azure.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://docs.microsoft.com/en-us/azure/defender-for-cloud/',
  supportsMultipleConnections: true,
  isActive: true,

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl:
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl:
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: [
        'https://management.azure.com/user_impersonation',
        'offline_access',
        'openid',
        'profile',
      ],
      pkce: false,
      clientAuthMethod: 'body',
      supportsRefreshToken: true,
      authorizationParams: {
        prompt: 'consent',
      },
      setupInstructions: `## Platform Admin: Enable Azure OAuth

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **New registration**
3. Name: \`CompAI Cloud Tests\`
4. Supported account types: **Accounts in any organizational directory** (Multitenant)
5. Redirect URI: Add the callback URL shown below as **Web** type
6. Click **Register**
7. Copy the **Application (client) ID** and paste below
8. Go to **Certificates & secrets** → **New client secret** → copy the **Value**

---

### About Permissions

**OAuth Scope:** This integration uses the \`user_impersonation\` scope on Azure Management API. This allows API calls on behalf of the signed-in user.

**Actual Access is Controlled by Azure RBAC:** The OAuth scope only enables API calls. The user can only access resources their Azure roles allow. Users connecting should have at minimum:
- **Reader** — general resource visibility
- **Security Reader** — Microsoft Defender for Cloud data

Our integration only makes read-only API calls for security scanning.`,
      createAppUrl:
        'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    },
  },

  baseUrl: 'https://management.azure.com',

  capabilities: ['checks'],

  services: [
    { id: 'defender', name: 'Microsoft Defender for Cloud', description: 'Cloud security posture management and threat protection', enabledByDefault: true, implemented: true },
    { id: 'entra-id', name: 'Microsoft Entra ID', description: 'Identity and access management monitoring', enabledByDefault: false, implemented: true },
    { id: 'policy', name: 'Azure Policy', description: 'Resource compliance and governance policy evaluation', enabledByDefault: false, implemented: true },
    { id: 'key-vault', name: 'Key Vault', description: 'Secret, key, and certificate management monitoring', enabledByDefault: false, implemented: true },
    { id: 'monitor', name: 'Azure Monitor', description: 'Activity logs and diagnostic settings audit', enabledByDefault: false, implemented: true },
    { id: 'network-watcher', name: 'Network Watcher', description: 'Network security group and flow log monitoring', enabledByDefault: false, implemented: true },
    { id: 'storage-account', name: 'Storage Accounts', description: 'HTTPS enforcement, public access, TLS version, and encryption checks', enabledByDefault: false, implemented: true },
    { id: 'sql-database', name: 'SQL Database', description: 'Auditing, TDE, firewall rules, and public access checks', enabledByDefault: false, implemented: true },
    { id: 'virtual-machine', name: 'Virtual Machines', description: 'Disk encryption, managed identity, and secure boot checks', enabledByDefault: false, implemented: true },
    { id: 'app-service', name: 'App Service', description: 'HTTPS enforcement, TLS, managed identity, and remote debugging checks', enabledByDefault: false, implemented: true },
    { id: 'aks', name: 'AKS', description: 'Kubernetes RBAC, network policies, private cluster, and auto-upgrade checks', enabledByDefault: false, implemented: true },
    { id: 'container-registry', name: 'Container Registry', description: 'Admin user, content trust, public access, and retention policy checks', enabledByDefault: false, implemented: true },
    { id: 'cosmos-db', name: 'Cosmos DB', description: 'Public access, key-based auth, failover, and backup configuration checks', enabledByDefault: false, implemented: true },
  ],

  variables: [
    {
      id: 'subscription_id',
      label: 'Azure Subscription ID',
      type: 'text',
      required: false,
      helpText:
        'Auto-detected after connecting. If not detected, find it at portal.azure.com → Subscriptions',
      placeholder: 'Auto-detected',
    },
  ],

  checks: [],
};
