import type { IntegrationManifest } from '../../types';

export const gcpManifest: IntegrationManifest = {
  id: 'gcp',
  name: 'Google Cloud Platform',
  description:
    'Read-only monitoring of IAM access, alerting and cloud tests in Google Cloud Platform',
  category: 'Cloud',
  logoUrl:
    'https://img.logo.dev/cloud.google.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  docsUrl: 'https://cloud.google.com/security-command-center/docs',
  isActive: true,

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'openid',
        'email',
        'profile',
      ],
      pkce: false,
      clientAuthMethod: 'body',
      supportsRefreshToken: true,
      authorizationParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      setupInstructions: `## Platform Admin: Enable GCP OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project for your OAuth app
3. Navigate to **APIs & Services** → **OAuth consent screen** and configure it
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth client ID**
6. Select **Web application**
7. Add the callback URL shown below to **Authorized redirect URIs**
8. Copy the **Client ID** and **Client Secret** below

---

### About the Required Permissions

**OAuth Scope:** This integration requires the \`cloud-platform\` scope to access Security Command Center findings.
We also request basic profile/email scopes so setup can identify which account to grant org IAM role to.

**Important:** While Google's consent screen will say "See, edit, configure and delete your Google Cloud data", this is the **only scope available** for Security Command Center API. Google does not offer a read-only alternative.

**Actual Access is Limited:** The OAuth scope just allows API calls. The real permissions are controlled by **IAM roles**. Users connecting their GCP account should only grant read-only IAM roles like:
- Security Center Findings Viewer (\`roles/securitycenter.findingsViewer\`)
- Viewer (\`roles/viewer\`)

Even with the \`cloud-platform\` OAuth scope, **users can only perform actions their IAM roles allow**. Our integration only makes read-only API calls.

This is industry standard - all GCP security monitoring tools use the same scope.`,
      createAppUrl: 'https://console.cloud.google.com/apis/credentials',
    },
  },

  baseUrl: 'https://cloudresourcemanager.googleapis.com',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },

  capabilities: ['checks'],

  services: [
    // All services below are scanned via Security Command Center (60+ check categories)
    { id: 'cloud-storage', name: 'Cloud Storage', description: 'Bucket ACLs, public access, logging, encryption, and retention checks', enabledByDefault: false, implemented: true },
    { id: 'compute-engine', name: 'Compute Engine', description: 'Instance security, service accounts, shielded VM, and OS login checks', enabledByDefault: false, implemented: true },
    { id: 'vpc-network', name: 'VPC Network', description: 'Firewall rules, open ports, SSH/RDP exposure, and flow log checks', enabledByDefault: false, implemented: true },
    { id: 'iam', name: 'IAM', description: 'Over-privileged accounts, MFA enforcement, service account key rotation, and role separation', enabledByDefault: false, implemented: true },
    { id: 'cloud-sql', name: 'Cloud SQL', description: 'Public IP, SSL enforcement, backup configuration, and database flag checks', enabledByDefault: false, implemented: true },
    { id: 'gke', name: 'GKE', description: 'Cluster security, private clusters, network policies, and workload identity checks', enabledByDefault: false, implemented: true },
    { id: 'cloud-kms', name: 'Cloud KMS', description: 'Encryption key rotation and project ownership checks', enabledByDefault: false, implemented: true },
    { id: 'cloud-logging', name: 'Cloud Logging', description: 'Audit logging, log export, and retention policy checks', enabledByDefault: false, implemented: true },
    { id: 'cloud-monitoring', name: 'Cloud Monitoring', description: 'Monitoring for audit config, firewall, network, and SQL changes', enabledByDefault: false, implemented: true },
    { id: 'cloud-dns', name: 'Cloud DNS', description: 'DNSSEC configuration and signing algorithm checks', enabledByDefault: false, implemented: true },
    { id: 'bigquery', name: 'BigQuery', description: 'Dataset encryption and public access checks', enabledByDefault: false, implemented: true },
    { id: 'pubsub', name: 'Pub/Sub', description: 'Topic encryption configuration checks', enabledByDefault: false, implemented: true },
    { id: 'cloud-armor', name: 'Cloud Armor', description: 'SSL policy strength and WAF configuration checks', enabledByDefault: false, implemented: true },
  ],

  // Integration-level variables (used by cloud security scanning)
  variables: [
    {
      id: 'organization_id',
      label: 'GCP Organization ID',
      type: 'text',
      required: false,
      helpText:
        'Auto-detected after connecting. If not detected, find it at console.cloud.google.com/iam-admin/settings',
      placeholder: 'Auto-detected',
    },
    {
      id: 'project_ids',
      label: 'GCP Projects',
      type: 'multi-select',
      required: false,
      helpText:
        'Select which GCP projects to scan and monitor. Findings are scoped to these projects.',
      fetchOptions: async (ctx) => {
        try {
          // Detect org first to scope projects
          const orgData = await ctx.fetch<{
            organizations?: Array<{
              name: string;
              state?: string;
            }>;
          }>(
            'https://cloudresourcemanager.googleapis.com/v3/organizations:search',
          );

          const activeOrg = (orgData.organizations ?? []).find(
            (o) => o.state === 'ACTIVE',
          );
          const orgId = activeOrg?.name?.replace('organizations/', '');

          const filter = orgId
            ? `lifecycleState:ACTIVE AND parent.id:${orgId}`
            : 'lifecycleState:ACTIVE';

          const data = await ctx.fetch<{
            projects?: Array<{
              projectId: string;
              name: string;
            }>;
          }>(`/v1/projects?filter=${encodeURIComponent(filter)}&pageSize=50`);

          if (!data.projects?.length) return [];

          return data.projects
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => ({
              value: p.projectId,
              label: `${p.name} (${p.projectId})`,
            }));
        } catch {
          return [];
        }
      },
    },
  ],

  checks: [],
};
