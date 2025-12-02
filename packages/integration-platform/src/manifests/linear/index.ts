import type { IntegrationManifest } from '../../types';
import { ssoEnabledCheck, adminUsersCheck, privateTeamsCheck } from './checks';

export const manifest: IntegrationManifest = {
  id: 'linear',
  name: 'Linear',
  description: 'Connect Linear to monitor organization security settings and access controls.',
  category: 'Development',
  logoUrl: 'https://img.logo.dev/linear.app?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://docs.trycomp.ai/integrations/linear',

  baseUrl: 'https://api.linear.app',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://linear.app/oauth/authorize',
      tokenUrl: 'https://api.linear.app/oauth/token',
      scopes: ['read'],
      pkce: false,
      clientAuthMethod: 'body',
      supportsRefreshToken: true,
      setupInstructions: `To create a Linear OAuth App:
1. Go to Linear Settings > Account > API > OAuth applications
2. Click "New OAuth application"
3. Set "Application name" to something descriptive
4. Set "Redirect callback URLs" to the callback URL shown below
5. Click "Create"
6. Copy the Client ID and Client Secret`,
      createAppUrl: 'https://linear.app/settings/api',
    },
  },

  capabilities: ['checks'],
  checks: [ssoEnabledCheck, adminUsersCheck, privateTeamsCheck],
  isActive: true,
};

export default manifest;
export * from './types';

