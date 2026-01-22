/**
 * Aikido Security Integration Manifest
 *
 * Aikido is a developer-focused security platform that scans code repositories,
 * containers, clouds, and domains for vulnerabilities.
 *
 * API Documentation: https://apidocs.aikido.dev/reference
 */

import type { IntegrationManifest } from '../../types';
import {
  codeRepositoryScanningCheck,
  issueCountThresholdCheck,
  openSecurityIssuesCheck,
} from './checks';

export const manifest: IntegrationManifest = {
  id: 'aikido',
  name: 'Aikido Security',
  description:
    'Connect Aikido Security to monitor vulnerabilities, code security, and compliance status across your repositories and infrastructure.',
  category: 'Security',
  logoUrl: 'https://img.logo.dev/aikido.dev?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://docs.trycomp.ai/integrations/aikido',

  // API configuration
  baseUrl: 'https://app.aikido.dev/api/public/v1/',
  defaultHeaders: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://app.aikido.dev/oauth/authorize',
      tokenUrl: 'https://app.aikido.dev/api/oauth/token',
      scopes: [],
      pkce: false,
      // Aikido uses Basic auth header for client credentials
      clientAuthMethod: 'header',
      supportsRefreshToken: true,
      setupInstructions: `To connect Aikido Security:

1. Go to Aikido Settings > Integrations > API
2. Click "Create OAuth App" or use existing credentials
3. Set the callback URL to the URL shown below
4. Copy the Client ID and Client Secret
5. Paste them here and click Connect

Note: You'll need admin access to your Aikido workspace to create OAuth credentials.`,
      createAppUrl: 'https://app.aikido.dev/settings/integrations/api/aikido/rest',
    },
  },

  capabilities: ['checks'],

  // Compliance checks that run daily
  checks: [openSecurityIssuesCheck, codeRepositoryScanningCheck, issueCountThresholdCheck],

  isActive: true,
};

export default manifest;
export * from './types';
