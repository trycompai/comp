/**
 * Rippling Integration Manifest
 *
 * This integration connects to Rippling to sync employee data.
 * It does NOT use the checks system - instead, a custom UI in the
 * people page handles the OAuth flow and employee sync.
 */

import type { IntegrationManifest } from '../../types';

export const ripplingManifest: IntegrationManifest = {
  id: 'rippling',
  name: 'Rippling',
  description: 'Sync employees from Rippling to your organization members',
  category: 'HR & People',
  logoUrl: 'https://img.logo.dev/rippling.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://developer.rippling.com',
  isActive: true,

  auth: {
    type: 'oauth2',
    config: {
      // {APP_NAME} is replaced at runtime with customSettings.appName from IntegrationOAuthApp
      authorizeUrl: 'https://app.rippling.com/apps/PLATFORM/{APP_NAME}/authorize',
      tokenUrl: 'https://api.rippling.com/api/o/token/',
      // Scopes are configured in the Rippling Developer Portal per-app
      // User needs: "Read access to Workers" under HR information
      scopes: [],
      pkce: false,
      // Rippling requires Basic Auth header with base64(client_id:client_secret)
      clientAuthMethod: 'header',
      supportsRefreshToken: true,
      setupInstructions: `To create a Rippling OAuth App:
1. Go to Rippling Developer Portal and create an app
2. Set the Default Redirect URL to the callback URL shown below
3. Copy the Client ID and Client Secret
4. Enable the required scopes under HR information: "Read access to Workers"
5. Note your app name - it's used in the authorize URL`,
      createAppUrl: 'https://app.rippling.com/partner',
      additionalOAuthSettings: [
        {
          id: 'appName',
          label: 'Rippling App Name',
          type: 'text',
          helpText:
            'Your app name from the Rippling developer portal. This appears in the authorize URL (app.rippling.com/apps/PLATFORM/{appName}/authorize).',
          required: true,
          token: '{APP_NAME}',
        },
      ],
    },
  },

  // V2 REST API base URL (different from V1 platform API)
  baseUrl: 'https://rest.ripplingapis.com',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },

  // Sync capability - this integration syncs employee data
  capabilities: ['sync'],

  // No checks defined - custom UI handles the sync
  checks: [],
};

export default ripplingManifest;

// Re-export types for external use
export * from './types';
