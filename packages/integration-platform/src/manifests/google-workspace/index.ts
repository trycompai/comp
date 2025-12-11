import type { IntegrationManifest } from '../../types';
import { employeeAccessCheck, twoFactorAuthCheck } from './checks';

export const googleWorkspaceManifest: IntegrationManifest = {
  id: 'google-workspace',
  name: 'Google Workspace',
  description: 'Monitor security settings and user compliance in Google Workspace',
  category: 'Identity & Access',
  logoUrl: 'https://img.logo.dev/google.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  docsUrl: 'https://developers.google.com/admin-sdk',
  isActive: true,

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/admin.directory.user.readonly',
        'https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
        'https://www.googleapis.com/auth/admin.directory.domain.readonly',
      ],
      pkce: false,
      clientAuthMethod: 'body',
      supportsRefreshToken: true,
      authorizationParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      setupInstructions: `To enable Google Workspace Admin SDK:
1. Go to Google Cloud Console (console.cloud.google.com)
2. Create or select a project
3. Enable the Admin SDK API
4. Create OAuth 2.0 credentials (Web application type)
5. Add the callback URL shown below to "Authorized redirect URIs"
6. Copy the Client ID and Client Secret

Note: The user authorizing must be a Google Workspace admin.`,
      createAppUrl: 'https://console.cloud.google.com/apis/credentials',
    },
  },

  baseUrl: 'https://admin.googleapis.com',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },

  capabilities: ['checks', 'sync'],

  checks: [twoFactorAuthCheck, employeeAccessCheck],
};
