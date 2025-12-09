# Integrations

Extensible platform for building integrations that run compliance checks and sync data from third-party services.

## Table of Contents

- [Integration Platform](#integration-platform)
  - [Table of Contents](#table-of-contents)
  - [For Developers: Writing Integrations](#for-developers-writing-integrations)
    - [Quick Start](#quick-start)
    - [Integration Manifest](#integration-manifest)
    - [Authentication Types](#authentication-types)
      - [OAuth 2.0](#oauth-20)
      - [API Key](#api-key)
      - [Custom Auth](#custom-auth)
    - [Writing Checks](#writing-checks)
      - [CheckContext API](#checkcontext-api)
    - [Variables](#variables)
    - [Testing](#testing)
  - [For Self-Hosters: OAuth Configuration](#for-self-hosters-oauth-configuration)
    - [Required Setup](#required-setup)
    - [How OAuth Works](#how-oauth-works)
    - [Provider-Specific Instructions](#provider-specific-instructions)
      - [GitHub](#github)
      - [Google Workspace](#google-workspace)
      - [Google Cloud Platform (GCP)](#google-cloud-platform-gcp)
      - [Linear](#linear)
      - [Rippling](#rippling)
      - [Vercel](#vercel)
    - [What Happens if OAuth Isn't Configured?](#what-happens-if-oauth-isnt-configured)
    - [Environment Variables](#environment-variables)
  - [Non-OAuth Integrations](#non-oauth-integrations)
    - [AWS](#aws)
    - [Azure](#azure)
  - [Advanced Topics](#advanced-topics)
    - [Custom Settings for OAuth Apps](#custom-settings-for-oauth-apps)
    - [Task Mapping](#task-mapping)
    - [Pagination](#pagination)
    - [Error Handling](#error-handling)
  - [File Structure](#file-structure)
  - [Examples](#examples)
  - [Deployment Checklist](#deployment-checklist)
  - [Support](#support)

---

## For Developers: Writing Integrations

### Quick Start

**Create a new integration in 5 steps:**

1. Create a folder in `src/manifests/your-integration/`
2. Define your manifest (`index.ts`)
3. Write checks (`checks/your-check.ts`)
4. Register the manifest (`src/registry/index.ts`)
5. Test it

### Integration Manifest

The manifest defines your integration's metadata, authentication, and available checks.

**Minimal example (`src/manifests/your-integration/index.ts`):**

```typescript
import type { IntegrationManifest } from '../../types';
import { yourCheck } from './checks';

export const yourIntegrationManifest: IntegrationManifest = {
  // Basic info
  id: 'your-integration',
  name: 'Your Integration',
  description: 'Monitor security and compliance in Your Service',
  category: 'Cloud', // or 'Identity & Access', 'Developer Tools', etc.
  logoUrl: 'https://img.logo.dev/your-service.com?token=YOUR_TOKEN',
  docsUrl: 'https://docs.your-service.com',
  isActive: true,

  // Authentication (see Authentication Types below)
  auth: {
    type: 'oauth2', // or 'api_key', 'basic', 'custom'
    config: {
      // Auth-specific config
    },
  },

  // API configuration
  baseUrl: 'https://api.your-service.com',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },

  // What this integration can do
  capabilities: ['checks'], // 'checks', 'webhook', 'sync'

  // Compliance checks this integration provides
  checks: [yourCheck],
};
```

### Authentication Types

#### OAuth 2.0

For services with OAuth support (GitHub, Google, etc.):

```typescript
auth: {
  type: 'oauth2',
  config: {
    authorizeUrl: 'https://provider.com/oauth/authorize',
    tokenUrl: 'https://provider.com/oauth/token',
    scopes: ['read:user', 'read:org'],
    pkce: false, // Set true if provider requires PKCE
    clientAuthMethod: 'body', // or 'header' for Basic Auth
    supportsRefreshToken: true, // Most OAuth providers support refresh

    // Optional: Additional OAuth params
    authorizationParams: {
      access_type: 'offline',
      prompt: 'consent',
    },

    // Admin setup instructions (shown in admin UI)
    setupInstructions: `## Platform Admin: Enable OAuth
1. Go to provider developer console
2. Create OAuth application
3. Add callback URL
4. Copy Client ID and Secret`,

    createAppUrl: 'https://provider.com/apps/new',
  },
},
```

**Access the token in checks:**

```typescript
run: async (ctx: CheckContext) => {
  const accessToken = ctx.accessToken; // Available for OAuth integrations
  // Use ctx.fetch() which automatically adds the Bearer token
  const data = await ctx.fetch('/api/endpoint');
};
```

#### API Key

For services with API key authentication:

```typescript
auth: {
  type: 'api_key',
  config: {
    in: 'header', // or 'query'
    name: 'X-API-Key', // Header name or query param name
    prefix: 'Bearer ', // Optional prefix
  },
},
```

#### Custom Auth

For complex authentication (service accounts, multi-field credentials):

```typescript
auth: {
  type: 'custom',
  config: {
    description: 'Service Account credentials',
    credentialFields: [
      {
        id: 'project_id',
        label: 'Project ID',
        type: 'text',
        required: true,
        placeholder: 'my-project-123',
        helpText: 'Your project identifier',
      },
      {
        id: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
      },
      {
        id: 'region',
        label: 'Region',
        type: 'combobox', // Dropdown with custom value support
        required: true,
        options: [
          { value: 'us-east-1', label: 'US East' },
          { value: 'eu-west-1', label: 'EU West' },
        ],
      },
    ],
    setupInstructions: `## Setup Instructions
1. Go to provider settings
2. Create API credentials
3. Copy the values below`,
  },
},
```

**Field types:** `'text'`, `'password'`, `'textarea'`, `'select'`, `'combobox'`, `'number'`, `'url'`

**Access credentials in checks:**

```typescript
run: async (ctx: CheckContext) => {
  const projectId = ctx.credentials.project_id;
  const apiKey = ctx.credentials.api_key;
  const region = ctx.credentials.region;
};
```

### Writing Checks

Checks are compliance validations that run against the external service.

**Basic check structure (`checks/your-check.ts`):**

```typescript
import type { IntegrationCheck, CheckContext } from '../../../types';
import { TASK_TEMPLATES } from '../../../task-mappings';

export const yourCheck: IntegrationCheck = {
  // Unique ID (kebab-case)
  id: 'your-check',

  // Display name
  name: 'Your Security Check',

  // What this check does
  description: 'Verifies security settings in Your Service',

  // Map to a compliance task template (optional)
  taskMapping: TASK_TEMPLATES.twoFactorAuth,

  // Default severity for findings
  defaultSeverity: 'medium',

  // User-configurable variables (see Variables section)
  variables: [],

  // The check logic
  run: async (ctx: CheckContext) => {
    ctx.log('Starting your check...');

    try {
      // Fetch data from the service
      const data = await ctx.fetch<YourDataType>('/api/endpoint');

      // Analyze and report findings
      if (data.securityEnabled) {
        ctx.pass({
          title: 'Security Enabled',
          resourceType: 'security-setting',
          resourceId: data.id,
          description: 'Security is properly configured',
          evidence: { setting: data.securitySetting },
        });
      } else {
        ctx.fail({
          title: 'Security Disabled',
          resourceType: 'security-setting',
          resourceId: data.id,
          severity: 'high',
          description: 'Security setting is not enabled',
          remediation: 'Enable security in Settings → Security → Enable Protection',
          evidence: { currentSetting: data.securitySetting },
        });
      }

      ctx.log('Check complete');
    } catch (error) {
      ctx.fail({
        title: 'Failed to Check Security Settings',
        resourceType: 'api-error',
        resourceId: 'unknown',
        severity: 'medium',
        description: `Could not fetch security settings: ${error.message}`,
        remediation: 'Verify your API credentials and try again',
        evidence: { error: String(error) },
      });
    }
  },
};
```

#### CheckContext API

**Available methods:**

```typescript
// Logging
ctx.log('Info message', { optional: 'metadata' });
ctx.warn('Warning message');

// HTTP requests (OAuth only - auto-adds Bearer token)
await ctx.fetch<T>('/path');
await ctx.fetchAllPages<T>('/path'); // Auto-paginate

// GraphQL (if provider supports it)
await ctx.graphql<T>(query, variables);

// Report findings
ctx.fail({
  title: 'Issue Title',
  resourceType: 'resource-type',
  resourceId: 'resource-123',
  severity: 'high', // 'critical' | 'high' | 'medium' | 'low' | 'info'
  description: 'What is wrong',
  remediation: 'How to fix it',
  evidence: { any: 'data' },
});

ctx.pass({
  title: 'Check Passed',
  resourceType: 'resource-type',
  resourceId: 'resource-123',
  description: 'What was checked',
  evidence: { any: 'data' },
});

// Access data
ctx.accessToken; // OAuth access token (if OAuth)
ctx.credentials; // All credentials as key-value object
ctx.variables; // User-configured variables
ctx.connectionId; // Current connection ID
ctx.organizationId; // Current organization ID
```

### Variables

Variables let users configure check behavior (e.g., which repos to monitor).

**Define variables:**

```typescript
import type { CheckVariable } from '../../../types';

const targetReposVariable: CheckVariable = {
  id: 'target_repos',
  label: 'Repositories to Monitor',
  type: 'multi-select',
  required: true,
  helpText: 'Select which repositories to check',

  // Static options
  options: [
    { value: 'repo1', label: 'Main Repository' },
    { value: 'repo2', label: 'API Repository' },
  ],

  // OR dynamic options (fetched from API)
  fetchOptions: async (ctx) => {
    const repos = await ctx.fetch<Repo[]>('/repos');
    return repos.map((r) => ({
      value: r.name,
      label: r.full_name,
    }));
  },
};

// Use in check
export const yourCheck: IntegrationCheck = {
  id: 'your-check',
  variables: [targetReposVariable],

  run: async (ctx) => {
    const targetRepos = ctx.variables.target_repos as string[];
    // Use the user-selected repos
  },
};
```

**Variable types:** `'text'`, `'number'`, `'boolean'`, `'select'`, `'multi-select'`

### Testing

**1. Register your manifest:**

```typescript
// src/registry/index.ts
import { yourIntegrationManifest } from '../manifests/your-integration';

export const registry: IntegrationRegistry = {
  // ... existing
  'your-integration': yourIntegrationManifest,
};
```

**2. Create OAuth app (if using OAuth):**

In the admin UI, go to **Admin** → **Integrations** → **OAuth Apps** and configure your Client ID/Secret.

**3. Connect and test:**

1. Go to **Integrations** page
2. Find your integration
3. Click **Connect**
4. Configure any required variables
5. Go to **Cloud Tests** or a mapped task
6. Click **Run Scan** or trigger the check

**4. View logs:**

Check logs show up in:

- Cloud Tests page (for security findings)
- Task automation results (for task-mapped checks)
- API logs (in your terminal or log aggregator)

---

## For Self-Hosters: OAuth Configuration

### Required Setup

**OAuth integrations require platform-level credentials** that you (the platform admin) configure in your deployment. Users then connect their accounts via OAuth without needing to know your credentials.

### How OAuth Works

1. **Platform admin** (you): Create OAuth app with the provider, configure Client ID/Secret in your deployment
2. **End users**: Click "Connect" → Sign in with provider → Authorize → Done

### Provider-Specific Instructions

#### GitHub

**1. Create OAuth App:**

- Go to https://github.com/settings/developers
- Click **New OAuth App**
- **Application name**: Your App Name
- **Homepage URL**: Your app URL (e.g., `https://yourapp.com`)
- **Authorization callback URL**: `https://yourapp.com/v1/integrations/oauth/callback`
- Copy **Client ID** and **Client Secret**

**2. Configure in Admin UI:**

- Go to `/admin/integrations` in your deployment
- Find **GitHub** → **Configure OAuth**
- Paste Client ID and Client Secret
- Save

**3. Users can now connect GitHub** via OAuth!

---

#### Google Workspace

**1. Create OAuth App:**

- Go to https://console.cloud.google.com
- Create or select a project
- Navigate to **APIs & Services** → **OAuth consent screen**
- Configure consent screen (internal or external)
- Go to **Credentials** → **Create Credentials** → **OAuth client ID**
- Select **Web application**
- Add redirect URI: `https://yourapp.com/v1/integrations/oauth/callback`
- Copy **Client ID** and **Client Secret**

**2. Enable APIs:**
In the same GCP project, enable:

- Admin SDK API

**3. Configure in Admin UI:**

- Go to `/admin/integrations`
- Find **Google Workspace** → **Configure OAuth**
- Paste Client ID and Client Secret
- Save

**Note:** Users connecting must be Google Workspace admins.

---

#### Google Cloud Platform (GCP)

**1. Create OAuth App:**

- Go to https://console.cloud.google.com
- Create or select a project (can reuse the same one as Google Workspace)
- Navigate to **APIs & Services** → **OAuth consent screen** (if not done already)
- Go to **Credentials** → **Create Credentials** → **OAuth client ID**
- Select **Web application**
- Add redirect URI: `https://yourapp.com/v1/integrations/oauth/callback`
- Copy **Client ID** and **Client Secret**

**2. Configure in Admin UI:**

- Go to `/admin/integrations`
- Find **Google Cloud Platform** → **Configure OAuth**
- Paste Client ID and Client Secret
- Save

**Important:** GCP and Google Workspace can share the same OAuth app (same Client ID/Secret). The platform will request different scopes for each.

**Note:** Users connecting must have GCP IAM roles like Viewer, Security Center Findings Viewer at the organization level.

---

#### Linear

**1. Create OAuth App:**

- Go to https://linear.app/settings/api
- Click **Create OAuth application**
- **Application name**: Your App Name
- **Callback URLs**: `https://yourapp.com/v1/integrations/oauth/callback`
- Copy **Client ID** and **Client Secret**

**2. Configure in Admin UI:**

- Go to `/admin/integrations`
- Find **Linear** → **Configure OAuth**
- Paste Client ID and Client Secret
- Save

---

#### Rippling

**1. Request OAuth App:**

- Contact Rippling support to create a marketplace app
- Provide your callback URL: `https://yourapp.com/v1/integrations/oauth/callback`
- Rippling will provide Client ID and Client Secret

**2. Configure in Admin UI:**

- Go to `/admin/integrations`
- Find **Rippling** → **Configure OAuth**
- Paste Client ID and Client Secret
- In **Custom Settings**, add:
  - **App Name**: Your Rippling app name (provided by Rippling)
- Save

**Note:** Rippling uses a custom `{APP_NAME}` placeholder in the authorize URL.

---

#### Vercel

**1. Create Integration:**

- Go to https://vercel.com/dashboard/integrations/console
- Click **Create Integration**
- **Integration name**: Your integration name
- **Redirect URLs**: `https://yourapp.com/v1/integrations/oauth/callback`
- Copy **Client ID** and **Client Secret**
- Copy your **Integration Slug** (e.g., `comp-compliance`)

**2. Configure in Admin UI:**

- Go to `/admin/integrations`
- Find **Vercel** → **Configure OAuth**
- Paste Client ID and Client Secret
- In **Custom Settings**, add:
  - **Integration Slug**: Your Vercel integration slug
- Save

---

### What Happens if OAuth Isn't Configured?

**For end users:**

- Integration shows **"Coming Soon"** button (disabled)
- Can't connect until platform admin configures OAuth

**For platform admins:**

- Integration works normally in admin UI
- Can test with your own accounts
- Must configure OAuth before users can connect

### Environment Variables

OAuth credentials are stored in the database, NOT environment variables. This allows:

- Multi-tenancy (different orgs can have different OAuth apps)
- Easy credential rotation via UI
- Secure encryption at rest

No `.env` configuration needed for OAuth!

---

## Non-OAuth Integrations

Some integrations use custom auth (AWS, Azure) and don't require platform-level OAuth setup. Users provide their own credentials:

### AWS

- **Auth type**: Custom (IAM Role)
- **User provides**: Role ARN, External ID, Region
- **No platform setup needed**

### Azure

- **Auth type**: Custom (Service Principal)
- **User provides**: Tenant ID, Client ID, Client Secret, Subscription ID
- **No platform setup needed**

---

## Advanced Topics

### Custom Settings for OAuth Apps

Some OAuth providers need additional configuration beyond Client ID/Secret:

```typescript
// In manifest
auth: {
  type: 'oauth2',
  config: {
    // ...
    customSettings: [
      {
        id: 'app_name',
        label: 'App Name',
        type: 'text',
        required: true,
        helpText: 'Your app name from the provider',
        token: '{APP_NAME}', // Replaces this in authorizeUrl
      },
    ],
  },
},
```

**Example:** Rippling uses `{APP_NAME}` in the authorize URL.

### Task Mapping

Map checks to compliance task templates so they auto-complete tasks:

```typescript
import { TASK_TEMPLATES } from '../../../task-mappings';

export const yourCheck: IntegrationCheck = {
  id: 'security-check',
  taskMapping: TASK_TEMPLATES.twoFactorAuth, // Maps to 2FA task
  // ...
};
```

When this check passes, the "2FA" task is automatically marked as done.

### Pagination

For APIs with pagination:

```typescript
// Auto-paginate (OAuth only)
const allItems = await ctx.fetchAllPages<Item>('/items');

// Manual pagination
let pageToken: string | undefined;
const allItems: Item[] = [];

do {
  const response = await ctx.fetch<{ items: Item[]; nextPage?: string }>(
    `/items?page=${pageToken || 1}`,
  );
  allItems.push(...response.items);
  pageToken = response.nextPage;
} while (pageToken);
```

### Error Handling

**Best practices:**

```typescript
try {
  const data = await ctx.fetch('/endpoint');

  if (data.items.length === 0) {
    // Log, don't fail - absence of items isn't always an error
    ctx.log('No items found');
    return;
  }

  // Process data...
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  ctx.log(`API Error: ${errorMessage}`);

  // Check for specific error types
  if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
    ctx.fail({
      title: 'Permission Denied',
      resourceType: 'api-access',
      resourceId: 'credentials',
      severity: 'high',
      description: 'Your account does not have permission to access this resource',
      remediation: 'Grant the [specific role] to your account in the provider console',
      evidence: { error: errorMessage },
    });
    return;
  }

  // Generic error
  ctx.fail({
    title: 'Failed to Fetch Data',
    resourceType: 'api-error',
    resourceId: 'unknown',
    severity: 'medium',
    description: 'An error occurred while fetching data from the provider',
    remediation: 'Verify your connection is active and try again',
    evidence: { error: errorMessage },
  });
}
```

**Don't show raw API errors to users** - extract meaningful info and provide actionable remediation.

---

## File Structure

```
manifests/your-integration/
├── index.ts              # Manifest definition
├── types.ts              # TypeScript types for this integration
├── checks/
│   ├── index.ts          # Export all checks
│   ├── check-one.ts      # Individual check
│   └── check-two.ts      # Another check
├── helpers/
│   ├── index.ts          # Export helpers
│   └── api-client.ts     # API client helpers
└── variables.ts          # Shared variables (optional)
```

## Examples

Check existing integrations for reference:

- **OAuth**: `manifests/github/`, `manifests/google-workspace/`
- **Custom Auth**: `manifests/aws/`, `manifests/azure/`, `manifests/gcp/`
- **Simple**: `manifests/linear/`, `manifests/vercel/`

---

## Deployment Checklist

Before shipping a new integration:

- [ ] Manifest complete with all required fields
- [ ] All checks tested with real credentials
- [ ] Error handling for common failure cases
- [ ] Task mappings configured (if applicable)
- [ ] Documentation in setup instructions
- [ ] Registered in `src/registry/index.ts`
- [ ] OAuth credentials configured (if OAuth)
- [ ] Logo URL working
- [ ] Integration tested end-to-end

---

## Support

Questions? Check:

- Existing integration manifests for examples
- Type definitions in `src/types.ts`
- Integration platform API in `apps/api/src/integration-platform/`
