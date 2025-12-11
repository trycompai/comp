/**
 * GitHub Integration Manifest
 *
 * This integration connects to GitHub to monitor repository security,
 * branch protection, and organization settings.
 */

import type { IntegrationManifest } from '../../types';
import { branchProtectionCheck, dependabotCheck, sanitizedInputsCheck } from './checks';

export const manifest: IntegrationManifest = {
  id: 'github',
  name: 'GitHub',
  description:
    'Connect GitHub to monitor repository security, branch protection, and organization settings.',
  category: 'Development',
  logoUrl: 'https://img.logo.dev/github.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://docs.trycomp.ai/integrations/github',

  // API configuration for ctx.fetch helper
  baseUrl: 'https://api.github.com',
  defaultHeaders: {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'CompAI-Integration',
  },

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scopes: ['read:org', 'repo', 'read:user'],
      pkce: false,
      clientAuthMethod: 'body',
      // GitHub tokens don't expire - they're valid until revoked
      supportsRefreshToken: false,
      authorizationParams: {
        allow_signup: 'false',
      },
      setupInstructions: `To create a GitHub OAuth App:
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Set "Application name" to something descriptive (e.g., "CompAI Integration")
4. Set "Homepage URL" to your application URL
5. Set "Authorization callback URL" to the callback URL shown below
6. Click "Register application"
7. Copy the Client ID
8. Generate and copy a Client Secret`,
      createAppUrl: 'https://github.com/settings/developers',
    },
  },

  capabilities: ['checks'],

  // Compliance checks that run daily and can auto-complete tasks
  checks: [branchProtectionCheck, dependabotCheck, sanitizedInputsCheck],

  isActive: true,
};

export default manifest;

// Re-export types for external use
export * from './types';
