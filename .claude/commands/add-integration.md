You are a **Principal Integration Engineer** building a dynamic integration for the CompAI platform. Your job is to generate a complete, production-quality integration definition and deploy it via the API.

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

For each check, map to the appropriate evidence task. **Use the task name as the check name.**

**Evidence Tasks (full list):**
```
2FA:                          frk_tt_68406cd9dde2d8cd4c463fe0
Employee Access:              frk_tt_68406ca292d9fffb264991b9
Role-based Access Controls:   frk_tt_68e80544d9734e0402cfa807
Access Review Log:            frk_tt_68e805457c2dcc784e72e3cc
Secure Secrets:               frk_tt_68407ae5274a64092c305104
Secure Code:                  frk_tt_68406e353df3bc002994acef
Code Changes:                 frk_tt_68406d64f09f13271c14dd01
Sanitized Inputs:             frk_tt_68406eedf0f0ddd220ea19c2
Secure Devices:               frk_tt_6840796f77d8a0dff53f947a
Device List:                  frk_tt_68406903839203801ac8041a
Encryption at Rest:           frk_tt_68e52b26bf0e656af9e4e9c3
Monitoring & Alerting:        frk_tt_68406af04a4acb93083413b9
Utility Monitoring:           frk_tt_6849c1a1038c3f18cfff47bf
Incident Response:            frk_tt_68406b4f40c87c12ae0479ce
App Availability:             frk_tt_68406d2e86acc048d1774ea6
TLS / HTTPS:                  frk_tt_68406f411fe27e47a0d6d5f3
Employee Verification:        frk_tt_68406951bd282273ebe286cc
Employee Descriptions:        frk_tt_684069a3a0dd8322b2ac3f03
Data Masking:                 frk_tt_686b51339d7e9f8ef2081a70
Backup logs:                  frk_tt_68e52b26b166e2c0a0d11956
Backup Restoration Test:      frk_tt_68e52b269db179c434734766
Internal Security Audit:      frk_tt_68e52b2618cb9d9722c6edfd
Separation of Environments:   frk_tt_68e52a484cad0014de7a628f
Infrastructure Inventory:     frk_tt_69033a6bfeb4759be36257bc
Production Firewall:          frk_tt_68fa2a852e70f757188f0c39
Organisation Chart:           frk_tt_68e52b274a7c38c62db08e80
Systems Description:          frk_tt_68dc1a3a9b92bb4ffb89e334
Publish Policies:             frk_tt_684076a02261faf3d331289d
Public Policies:              frk_tt_6840791cac0a7b780dbaf932
Contact Information:          frk_tt_68406a514e90bb6e32e0b107
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

### Step 4: Deploy via API
Use the **PUT upsert endpoint** to create or update the integration. This is idempotent — safe to run multiple times.

**Endpoint:** `PUT /v1/internal/dynamic-integrations`
**Auth:** `X-Internal-Token` header (use env var `INTERNAL_API_TOKEN`, or omit in local dev)
**Base URL:** `http://localhost:3333` (local) or production API URL

```bash
curl -X PUT http://localhost:3333/v1/internal/dynamic-integrations \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: ${INTERNAL_API_TOKEN}" \
  -d '{
    "slug": "service-name",
    "name": "Service Name",
    "description": "...",
    "category": "Cloud",
    "logoUrl": "https://img.logo.dev/domain.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ",
    "baseUrl": "https://api.example.com/",
    "authConfig": { ... },
    "capabilities": ["checks"],
    "checks": [ ... ]
  }'
```

**Other available endpoints:**
```
PUT    /v1/internal/dynamic-integrations              — Upsert integration + checks (primary)
POST   /v1/internal/dynamic-integrations              — Create (fails if exists)
GET    /v1/internal/dynamic-integrations              — List all
GET    /v1/internal/dynamic-integrations/:id          — Get details
PATCH  /v1/internal/dynamic-integrations/:id          — Update fields
DELETE /v1/internal/dynamic-integrations/:id          — Delete
POST   /v1/internal/dynamic-integrations/:id/checks   — Add check
PATCH  /v1/internal/dynamic-integrations/:id/checks/:checkId — Update check
DELETE /v1/internal/dynamic-integrations/:id/checks/:checkId — Delete check
POST   /v1/internal/dynamic-integrations/:id/activate   — Activate + create provider
POST   /v1/internal/dynamic-integrations/:id/deactivate — Deactivate
```

### Step 5: Verify
1. Confirm the API returns `{ success: true, id: "...", slug: "...", checksCount: N }`
2. Tell the user to restart the API server (or wait 60 seconds for auto-refresh)

### Step 6: Post-Integration Report
After completing, report to the user:

**What was done:**
- Integration name, slug, number of checks
- Which evidence tasks each check maps to

**What the user needs to do:**
- Configure OAuth credentials in admin panel (if OAuth integration)
- Register OAuth app with the provider (provide the exact URL)
- Add required scopes (list them)
- Set redirect URI to: `{BASE_URL}/v1/integrations/oauth/callback`
- Any provider-specific setup (e.g., enable Identity Platform for Firebase)

**Complexity assessment:**
- 🟢 Simple: API key auth, no approval needed (e.g., SendGrid, Datadog)
- 🟡 Medium: OAuth with existing provider (e.g., Google services — reuse existing Google OAuth app)
- 🔴 Complex: OAuth requiring new app registration + provider approval process (e.g., Rippling, Salesforce)

## Important Lessons (from production experience)

### Base URL trailing slash
If the base URL has a path component (e.g., `https://graph.microsoft.com/v1.0`), add a trailing slash: `https://graph.microsoft.com/v1.0/`. Otherwise `new URL('users', base)` resolves incorrectly.

### Full URL in fetch paths
When a check needs to call a DIFFERENT API domain than the base URL, use the full URL in the path:
```json
{ "type": "fetch", "path": "https://other-api.com/v1/endpoint", "as": "data" }
```

### Google OAuth — ALWAYS include offline access
For ANY Google/Firebase integration, add `authorizationParams`:
```json
"authorizationParams": { "access_type": "offline", "prompt": "consent" }
```
Without this, Google won't issue a refresh token and the integration breaks after 1 hour.

### Google OAuth endpoints
- Authorize: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- Supports PKCE and refresh tokens
- Scopes are full URLs like `https://www.googleapis.com/auth/firebase.readonly`

### Microsoft Graph scopes
Use `https://graph.microsoft.com/.default` instead of individual scopes. The `.default` scope requests all permissions already granted to the app.

### Microsoft Graph pagination
Uses `@odata.nextLink` which returns a full URL. Our `fetchWithCursor` handles this — set `cursorPath` to `@odata.nextLink` and it follows the full URL automatically.

### Variables are dynamic
Any variable in a check's `variables` array automatically shows as a form field in the UI. No frontend changes needed.

### Check names match evidence task names
If the evidence task is "2FA", name the check "2FA". This is what the customer sees.

### Don't use `$` in query params via the `params` field
URL `$` characters get encoded to `%24`. Put OData-style params directly in the path: `users?$select=id,name`.

### Handle empty API responses
When using `branch` to check collection existence before `forEach`, use the raw response variable (e.g., `releasesResponse.releases.length`).

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

### Logical Operators:
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
- Seed directly to DB — always use the API

**DO:**
- Use the PUT upsert endpoint for all integration creation/updates
- Use correct OAuth2 scopes (least privilege)
- Handle pagination correctly for each API's specific strategy
- Write remediation that references actual UI navigation paths
- Always define variables when checks need user config
- Name checks to match the evidence task name
- Add trailing slash to base URLs with path components
- Include `access_type: offline` for all Google OAuth integrations
- Report what the user needs to do manually after integration is created
