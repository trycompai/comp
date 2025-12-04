# Integration Platform

A scalable, config-driven integration system for adding third-party integrations.

## Architecture

```
packages/integration-platform/
├── src/
│   ├── types.ts              # Core type definitions
│   ├── index.ts              # Main exports
│   ├── registry/             # Integration registry
│   │   └── index.ts          # Registry singleton & helpers
│   ├── manifests/            # Integration manifests
│   │   ├── github.manifest.tsx
│   │   └── _template.manifest.tsx
│   └── validators/           # Validation tools
│       └── manifest-validator.ts
```

## Adding a New Integration

1. **Copy the template:**

   ```bash
   cp src/manifests/_template.manifest.tsx src/manifests/your-integration.manifest.tsx
   ```

2. **Update the manifest** with your integration details:
   - `id`: Unique slug (e.g., "slack", "jira")
   - `name`: Display name
   - `description`: Short description
   - `category`: One of: Cloud, Identity & Access, HR & People, Development, Communication, Monitoring, Infrastructure, Security, Productivity
   - `auth`: Authentication strategy (oauth2, api_key, basic, jwt, custom)
   - `capabilities`: What the integration can do (sync, webhook, realtime, write)
   - `handler`: Runtime implementation

3. **Register in the registry:**

   ```typescript
   // src/registry/index.ts
   import { manifest as yourManifest } from '../manifests/your-integration.manifest';

   const allManifests: IntegrationManifest[] = [
     githubManifest,
     yourManifest, // Add here
   ];
   ```

4. **Validate your manifest:**
   ```bash
   bun run verify
   ```

## Auth Strategies

### OAuth2

```typescript
auth: {
  type: 'oauth2',
  config: {
    authorizeUrl: 'https://example.com/oauth/authorize',
    tokenUrl: 'https://example.com/oauth/token',
    scopes: ['read', 'write'],
    pkce: false,
    clientIdEnvVar: 'EXAMPLE_CLIENT_ID',
    clientSecretEnvVar: 'EXAMPLE_CLIENT_SECRET',
    clientAuthMethod: 'body', // or 'header'
  },
}
```

### API Key

```typescript
auth: {
  type: 'api_key',
  config: {
    in: 'header',
    name: 'Authorization',
    prefix: 'Bearer ',
  },
}
```

### Basic Auth

```typescript
auth: {
  type: 'basic',
  config: {
    usernameField: 'username',
    passwordField: 'password',
  },
}
```

## Handler Implementation

```typescript
const handler: IntegrationHandler = {
  // Test credentials validity
  async testConnection(credentials) {
    const response = await fetch('https://api.example.com/me', {
      headers: { Authorization: `Bearer ${credentials.access_token}` },
    });
    return response.ok;
  },

  // Full sync - fetch all data
  async fetchFull(credentials, context) {
    context.logger.info('Starting full sync');

    const findings = [];
    // ... fetch and process data

    return { findings, hasMore: false };
  },

  // Delta sync - fetch changes since cursor
  async fetchDelta(credentials, context) {
    const cursor = context.cursor;
    // ... fetch changes since cursor
    return { findings: [], cursor: 'new-cursor', hasMore: false };
  },
};
```

## Database Models

The integration platform uses these Prisma models:

- `IntegrationProvider`: Stores provider metadata (synced from manifests)
- `IntegrationConnection`: Organization's connection to a provider
- `IntegrationCredentialVersion`: Encrypted credentials with versioning
- `IntegrationRun`: Sync execution records
- `IntegrationPlatformFinding`: Results from syncs
- `IntegrationOAuthState`: OAuth CSRF protection

## API Endpoints

- `POST /integrations/oauth/start` - Start OAuth flow
- `GET /integrations/oauth/callback` - OAuth callback
- `GET /integrations/connections/providers` - List providers
- `GET /integrations/connections/providers/:slug` - Get provider details
- `GET /integrations/connections` - List org connections
- `POST /integrations/connections` - Create connection (API key)
- `POST /integrations/connections/:id/test` - Test connection
- `POST /integrations/connections/:id/pause` - Pause connection
- `POST /integrations/connections/:id/resume` - Resume connection
- `DELETE /integrations/connections/:id` - Delete connection

## OAuth Credentials

The platform supports **two sources** for OAuth credentials:

### 1. Platform-Level (Environment Variables)

For cloud deployments or when you want to provide pre-configured OAuth apps:

```bash
# GitHub
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# API URLs
API_URL=http://localhost:3001
APP_URL=http://localhost:3000
```

### 2. Organization-Level (Database)

Organizations can configure their own OAuth apps via the API:

```bash
# Save custom OAuth app credentials
POST /integrations/oauth-apps
{
  "providerSlug": "github",
  "organizationId": "org_xxx",
  "clientId": "your_client_id",
  "clientSecret": "your_client_secret"
}

# Get setup instructions for creating an OAuth app
GET /integrations/oauth-apps/setup/github?organizationId=org_xxx

# Check credential availability
GET /integrations/oauth/availability?providerSlug=github&organizationId=org_xxx
```

### Credential Resolution Order

1. **Organization credentials** - If the org has custom OAuth app credentials, use those
2. **Platform credentials** - Fall back to environment variables

This allows:

- **Cloud users**: Click "Connect" using platform-provided OAuth apps
- **Self-hosters**: Create their own OAuth apps and configure credentials
- **Contributors**: Submit manifest code without needing OAuth app access

### Manifest Setup Instructions

Each manifest can include setup instructions for self-hosters:

```typescript
auth: {
  type: 'oauth2',
  config: {
    // ... OAuth URLs and scopes
    clientIdEnvVar: 'GITHUB_CLIENT_ID',
    clientSecretEnvVar: 'GITHUB_CLIENT_SECRET',
    setupInstructions: 'Go to GitHub Settings > Developer settings...',
    createAppUrl: 'https://github.com/settings/developers',
  },
}
```
