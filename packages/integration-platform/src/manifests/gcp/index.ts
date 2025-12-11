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
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
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

  // Integration-level variables (used by cloud security scanning)
  variables: [
    {
      id: 'organization_id',
      label: 'GCP Organization ID',
      type: 'text',
      required: true,
      helpText:
        'Your GCP Organization ID (numeric). Find it at: console.cloud.google.com/iam-admin/settings',
      placeholder: '123456789012',
    },
  ],

  checks: [],
};
