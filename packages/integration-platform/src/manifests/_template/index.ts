/**
 * Integration Manifest Template
 *
 * To create a new integration:
 * 1. Copy this entire folder to src/manifests/your-integration/
 * 2. Rename files and update the manifest details
 * 3. Implement your checks in the checks/ folder
 * 4. Register it in src/registry/index.ts
 * 5. Run `bun run verify` to validate your manifest
 * 6. Run `bun run build` to compile
 */

import type { IntegrationManifest } from '../../types';
import { exampleCheck } from './checks';
import { YourIntegrationLogo } from './logo';

export const manifest: IntegrationManifest = {
  // ============================================================================
  // Basic Info
  // ============================================================================

  // Unique identifier - lowercase, no spaces (e.g., "slack", "jira", "aws")
  id: 'your-integration',

  // Display name
  name: 'Your Integration',

  // Short description for the catalog
  description: 'Connect Your Integration to sync data and monitor security.',

  // Category for grouping in the UI
  // Options: Cloud, Identity & Access, HR & People, Development, Communication,
  //          Monitoring, Infrastructure, Security, Productivity
  category: 'Development',

  // Logo component
  logo: YourIntegrationLogo,

  // Documentation URL (optional)
  docsUrl: 'https://docs.trycomp.ai/integrations/your-integration',

  // ============================================================================
  // API Configuration (for ctx.fetch helper)
  // ============================================================================

  baseUrl: 'https://api.example.com',
  defaultHeaders: {
    Accept: 'application/json',
    'User-Agent': 'CompAI-Integration',
  },

  // ============================================================================
  // Authentication
  // ============================================================================

  // Option 1: OAuth2 (most common)
  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://example.com/oauth/authorize',
      tokenUrl: 'https://example.com/oauth/token',
      scopes: ['read', 'write'],
      pkce: false,
      clientAuthMethod: 'body', // or 'header' for Basic auth
      setupInstructions: `To create an OAuth app for this integration:
1. Go to the provider's developer settings
2. Create a new OAuth application
3. Set the callback URL to the one shown in the admin panel
4. Copy the Client ID and Client Secret`,
      createAppUrl: 'https://example.com/developers',
    },
  },

  // Option 2: API Key
  // auth: {
  //   type: 'api_key',
  //   config: {
  //     in: 'header',
  //     name: 'Authorization',
  //     prefix: 'Bearer ',
  //   },
  // },

  // Option 3: Basic Auth
  // auth: {
  //   type: 'basic',
  //   config: {
  //     usernameField: 'username',
  //     passwordField: 'password',
  //   },
  // },

  // ============================================================================
  // Capabilities
  // ============================================================================

  capabilities: ['checks'], // Options: checks, webhook

  // ============================================================================
  // Compliance Checks
  // ============================================================================

  // Checks run daily via a scheduled Trigger.dev task.
  // Each check can auto-complete linked tasks when passing.
  checks: [exampleCheck],

  // ============================================================================
  // Status
  // ============================================================================

  isActive: false, // Set to true when ready for production
};

export default manifest;

// Re-export types for external use
export * from './types';

