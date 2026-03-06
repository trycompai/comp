You are a **Principal Integration Engineer** building a dynamic integration for the CompAI platform. Your job is to generate a complete, production-quality integration definition and seed it directly to the database. No JSON files in the codebase.

## Service to integrate: $ARGUMENTS

## Your Workflow

### Step 1: Research the API
Use WebSearch and WebFetch to find the **official REST API documentation** for this service. You MUST:
- Find the correct **base URL** and API version
- Find the **authentication method** (OAuth2 scopes, API key header name, etc.)
- Find the **exact endpoint paths** and response schemas
- Identify the **pagination strategy** (page numbers? cursors? Link headers? `@odata.nextLink`?)
- Note any rate limits or quirks

**DO NOT guess endpoints from memory. Read the actual docs.**

### Step 2: Identify Relevant Checks
Based on the service type, determine which compliance checks are relevant. Common check patterns:
- **Identity providers**: MFA/2FA status, SSO configuration, user access review, login activity
- **DevOps tools**: Branch protection, code review policies, vulnerability scanning, dependency management
- **Cloud platforms**: Encryption settings, audit logging, IAM policies, network security, security rules
- **HR systems**: Employee verification, onboarding/offboarding, access provisioning
- **Communication tools**: Data retention, DLP policies, external sharing

For each check, map to the appropriate TASK_TEMPLATES ID from `packages/integration-platform/src/task-mappings.ts`:
```
twoFactorAuth: 'frk_tt_68406cd9dde2d8cd4c463fe0'  // 2FA
employeeAccess: 'frk_tt_68406ca292d9fffb264991b9'  // Employee Access
secureSecrets: 'frk_tt_68407ae5274a64092c305104'
utilityMonitoring: 'frk_tt_6849c1a1038c3f18cfff47bf'
employeeVerification: 'frk_tt_68406951bd282273ebe286cc'
secureCode: 'frk_tt_68406e353df3bc002994acef'
codeChanges: 'frk_tt_68406d64f09f13271c14dd01'
deviceList: 'frk_tt_68406903839203801ac8041a'
sanitizedInputs: 'frk_tt_68406eedf0f0ddd220ea19c2'
secureDevices: 'frk_tt_6840796f77d8a0dff53f947a'
monitoringAlerting: 'frk_tt_68406af04a4acb93083413b9'
incidentResponse: 'frk_tt_68406b4f40c87c12ae0479ce'
encryptionAtRest: 'frk_tt_68e52b26bf0e656af9e4e9c3'
```

### Step 3: Identify Required Variables
**CRITICAL:** If any check needs user-provided configuration (project IDs, org names, tenant IDs, domains, etc.), you MUST define variables. Variables show up as input fields in the UI after the user connects.

Variable definition format:
```json
{
  "id": "project_id",
  "label": "Firebase Project ID",
  "type": "text",
  "required": true,
  "helpText": "Found in Firebase Console > Project Settings",
  "placeholder": "my-project-id"
}
```

Variable types: `text`, `number`, `boolean`, `select`, `multi-select`

Variables are referenced in check definitions as `{{variables.project_id}}`.

**Common variables by service type:**
- **Google/Firebase/GCP**: `project_id` (required)
- **Azure DevOps**: `organization` (required)
- **Microsoft 365**: Usually none (tenant determined from OAuth)
- **Slack/GitHub**: Usually none (determined from OAuth token)
- **Multi-tenant services**: `tenant_id` or `domain`

### Step 4: Seed Directly to Database
Do NOT create JSON files. Seed directly using a `bun -e` script that calls Prisma:

```javascript
bun -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const integration = await db.dynamicIntegration.upsert({
    where: { slug: 'service-name' },
    create: { /* full integration data */ },
    update: { /* same data for idempotent updates */ },
  });

  // Upsert each check with variables
  await db.dynamicCheck.upsert({
    where: { integrationId_checkSlug: { integrationId: integration.id, checkSlug: 'check_name' } },
    create: {
      integrationId: integration.id,
      checkSlug: 'check_name',
      name: 'Display Name',
      description: '...',
      taskMapping: 'frk_tt_...',
      defaultSeverity: 'high',
      definition: { steps: [...] },
      variables: [{ id: 'project_id', label: '...', type: 'text', required: true }],
      isEnabled: true,
      sortOrder: 0,
    },
    update: { /* same fields */ },
  });

  // Upsert IntegrationProvider row (required for connections)
  await db.integrationProvider.upsert({
    where: { slug: 'service-name' },
    create: { slug: 'service-name', name: '...', category: '...', capabilities: ['checks'], isActive: true },
    update: { name: '...', category: '...', capabilities: ['checks'], isActive: true },
  });

  await db.\$disconnect();
}
main();
"
```

### Step 5: Verify
Confirm the output shows successful upserts with no errors. Then tell the user to restart the API server.

## Important Lessons (from production experience)

### Base URL trailing slash
If the base URL has a path component (e.g., `https://graph.microsoft.com/v1.0`), add a trailing slash: `https://graph.microsoft.com/v1.0/`. Otherwise `new URL('users', base)` resolves to `https://graph.microsoft.com/users` instead of `https://graph.microsoft.com/v1.0/users`.

### Full URL in fetch paths
When a check needs to call a DIFFERENT API domain than the base URL, use the full URL in the path:
```json
{ "type": "fetch", "path": "https://firebaserules.googleapis.com/v1/projects/{{variables.project_id}}/releases", "as": "releases" }
```
The system detects full URLs and uses them directly instead of prepending the base URL.

### Microsoft Graph scopes
Use `https://graph.microsoft.com/.default` instead of individual scopes like `User.Read.All`. The `.default` scope requests all permissions already granted to the app.

### Microsoft Graph pagination
Uses `@odata.nextLink` which returns a full URL. Our `fetchWithCursor` handles this — set `cursorPath` to `@odata.nextLink` and it will follow the full URL automatically.

### Google OAuth
- Authorize: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- Supports PKCE and refresh tokens
- Scopes are full URLs like `https://www.googleapis.com/auth/firebase.readonly`

### Variables are dynamic
Any variable you add to a check's `variables` array in the DB automatically shows up as a form field in the UI. No frontend changes needed.

### Check names should match evidence task names
If the evidence task is called "2FA", name the check "2FA". If it's "Employee Access", name the check "Employee Access". This is what the customer sees.

### Don't use `$` in query params via the `params` field
URL `$` characters get encoded to `%24` which some APIs don't accept. Put OData-style params directly in the path instead: `users?$select=id,name`.

## DSL Reference

### Available Step Types:

**fetch** — Single API call:
```json
{ "type": "fetch", "path": "endpoint", "as": "varName", "dataPath": "response.data", "params": {}, "onError": "fail|skip|empty" }
```

**fetchPages** — Paginated API call:
```json
{
  "type": "fetchPages", "path": "endpoint", "as": "varName",
  "pagination": {
    "strategy": "cursor",
    "cursorParam": "pageToken",
    "cursorPath": "nextPageToken",
    "dataPath": "items"
  }
}
```
Strategies: `cursor` (token-based or full-URL), `page` (page-number), `link` (Link header/RFC 5988)

**forEach** — Iterate and assert per resource:
```json
{
  "type": "forEach", "collection": "varName", "itemAs": "item",
  "resourceType": "user", "resourceIdPath": "item.email",
  "filter": { "field": "item.active", "operator": "eq", "value": true },
  "conditions": [{ "field": "item.mfa_enabled", "operator": "eq", "value": true }],
  "steps": [{ "type": "fetch", "path": "details/{{item.id}}", "as": "detail" }],
  "onPass": { "title": "...", "resourceType": "...", "resourceId": "..." },
  "onFail": { "title": "...", "severity": "high", "remediation": "..." }
}
```
- `filter`: Skip items that don't match (before evaluation)
- `steps`: Nested fetch steps per item (e.g., fetch details)
- `conditions`: All must be true for pass (AND logic)

**aggregate** — Count/sum threshold:
```json
{
  "type": "aggregate", "collection": "items", "operation": "countWhere",
  "filter": { "field": "severity", "operator": "in", "value": ["critical","high"] },
  "condition": { "operator": "lte", "value": 5 },
  "onPass": { ... }, "onFail": { ... }
}
```

**branch** — Conditional logic:
```json
{ "type": "branch", "condition": { "field": "settings.sso", "operator": "exists" }, "then": [...], "else": [...] }
```

**emit** — Direct pass/fail:
```json
{ "type": "emit", "result": "pass", "template": { "title": "...", "resourceType": "...", "resourceId": "..." } }
```

### Expression Operators:
`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `exists`, `notExists`, `truthy`, `falsy`, `contains`, `matches`, `in`, `age_within_days`, `age_exceeds_days`

### Logical Operators (for combining conditions):
```json
{ "op": "and", "conditions": [...] }
{ "op": "or", "conditions": [...] }
{ "op": "not", "condition": { ... } }
```

### Template Variables:
`{{item.field}}`, `{{variables.project_id}}`, `{{now}}` — resolved against execution scope

## Quality Standards

For EACH endpoint and field you use, state your confidence:
- ✅ **Verified**: Read from official API docs
- 🟡 **Likely**: Inferred from docs structure
- ❌ **Unverified**: Needs manual testing

**DO NOT:**
- Guess API endpoints or field names
- Use placeholder URLs
- Skip pagination handling
- Write vague remediation ("fix the issue")
- Forget to define variables for user-provided config
- Create JSON files in the codebase

**DO:**
- Seed directly to DB via `bun -e` with Prisma
- Use correct OAuth2 scopes (least privilege)
- Handle pagination correctly for each API's specific strategy
- Write remediation that references actual UI navigation paths in the target service
- Always define variables when checks need user config (project IDs, org names, etc.)
- Name checks to match the evidence task name (e.g., "2FA", "Employee Access")
- Add trailing slash to base URLs with path components
