/**
 * Integration Manifest Template
 *
 * Steps to create a new integration:
 * 1. Copy this folder to src/manifests/your-integration/
 * 2. Update manifest details below
 * 3. Implement checks in checks/
 * 4. Register in src/registry/index.ts
 * 5. Run `bun run verify` then `bun run build`
 */

import type { IntegrationManifest } from '../../types';
import { exampleCheck } from './checks';

export const manifest: IntegrationManifest = {
  id: 'your-integration',
  name: 'Your Integration',
  description: 'Connect Your Integration to monitor security compliance.',
  category: 'Development',
  logoUrl: 'https://img.logo.dev/example.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://docs.trycomp.ai/integrations/your-integration',

  baseUrl: 'https://api.example.com',
  defaultHeaders: {
    Accept: 'application/json',
  },

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://example.com/oauth/authorize',
      tokenUrl: 'https://example.com/oauth/token',
      scopes: ['read', 'write'],
      pkce: false,
      clientAuthMethod: 'body',
      supportsRefreshToken: true,
      setupInstructions: `1. Create OAuth app at provider's developer settings
2. Set callback URL to: {CALLBACK_URL}
3. Copy Client ID and Secret`,
      createAppUrl: 'https://example.com/developers',
    },
  },

  /*
  // API Key auth:
  auth: {
    type: 'api_key',
    config: { in: 'header', name: 'Authorization', prefix: 'Bearer ' },
  },
  credentialFields: [
    { id: 'api_key', label: 'API Key', type: 'password', required: true },
  ],

  // Basic auth:
  auth: {
    type: 'basic',
    config: { usernameField: 'username', passwordField: 'password' },
  },
  */

  capabilities: ['checks'],
  checks: [exampleCheck],
  isActive: false,
};

export default manifest;
export * from './types';
