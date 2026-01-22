/**
 * Ramp Integration Manifest
 *
 * This integration connects to Ramp to sync employee data.
 * It uses OAuth2 and the Developer API user endpoints.
 */

import type { IntegrationManifest } from '../../types';

export const rampManifest: IntegrationManifest = {
  id: 'ramp',
  name: 'Ramp',
  description: 'Sync employees from Ramp to your organization members',
  category: 'HR & People',
  logoUrl: 'https://img.logo.dev/ramp.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://docs.ramp.com/developer-api/v1/authorization',
  isActive: true,

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://app.ramp.com/v1/authorize',
      tokenUrl: 'https://api.ramp.com/developer/v1/token',
      scopes: ['users:read'],
      pkce: false,
      clientAuthMethod: 'header',
      supportsRefreshToken: true,
      revoke: {
        url: 'https://api.ramp.com/developer/v1/token/revoke',
        method: 'POST',
        auth: 'basic',
        body: 'form',
        tokenField: 'token',
      },
      setupInstructions: `To create a Ramp OAuth app:
1. Open the Ramp Developer Dashboard
2. Create a new OAuth app
3. Add the callback URL shown below
4. Request the users:read scope
5. Copy the Client ID and Client Secret`,
    },
  },

  baseUrl: 'https://api.ramp.com',
  defaultHeaders: {
    Accept: 'application/json',
  },

  capabilities: ['sync'],
  checks: [],
};

export default rampManifest;
export * from './types';
