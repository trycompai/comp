You are a **Principal Integration Engineer** building a dynamic integration for the CompAI platform. Your job is to generate a complete, production-quality integration definition and deploy it via the API.

## Service to integrate: $ARGUMENTS

**Before starting:** Read `.claude/commands/integration-examples.md` for production-tested examples. Also call `GET /v1/internal/dynamic-integrations` to see existing integrations as reference.

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
- **Microsoft 365/Intune**: Usually none (tenant determined from OAuth)
- **Slack/GitHub**: Usually none (determined from OAuth token)
- **Multi-tenant services**: `tenant_id` or `domain`

### Step 4: Pre-Deployment Validation (MANDATORY)
Before deploying, verify EVERY item in this checklist. These are real bugs we hit in production:

**JSON structure:**
- [ ] `capabilities` is `["checks"]` NOT `{"checks"}` — must be a JSON array, not an object
- [ ] `defaultHeaders` is `{}` not empty — must be valid JSON object

**Base URL:**
- [ ] If URL has a path component (e.g., `/v1.0`), add trailing slash: `https://api.example.com/v1.0/`
- [ ] Test mentally: `new URL('endpoint', baseUrl)` — does it resolve correctly?

**API paths in check definitions:**
- [ ] **ALWAYS use full URLs** in fetch/fetchPages paths (e.g., `https://graph.microsoft.com/v1.0/deviceManagement/...`)
- [ ] NEVER start paths with `/` — it skips the base URL path component
- [ ] If using `$select` or other OData params, put them directly in the path URL, NOT in `params`

**OAuth config:**
- [ ] Google: includes `"authorizationParams": {"access_type": "offline", "prompt": "consent"}`
- [ ] Microsoft: use EXPLICIT scopes, NOT `.default` — `.default` doesn't always work (especially for Intune)
- [ ] Microsoft: scopes must be added as **Delegated** permissions (not Application) in Azure app
- [ ] `supportsRefreshToken` is `true`
- [ ] `clientAuthMethod` is set correctly (`"body"` for most, `"header"` for some like Rippling)

**Check definitions:**
- [ ] Every check has `variables` array with required user inputs (project IDs, org names, etc.)
- [ ] `forEach` handles empty collections gracefully (use `branch` to check length first if needed)
- [ ] `onFail` includes real remediation with actual UI navigation paths
- [ ] Check names match evidence task names exactly

**Provider setup:**
- [ ] Redirect URI `{BASE_URL}/v1/integrations/oauth/callback` must be registered with the OAuth provider
- [ ] Production redirect: `https://api.trycomp.ai/v1/integrations/oauth/callback`

### Step 5: Deploy via API
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
    "baseUrl": "https://api.example.com/v1/",
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

### Step 6: Verify Deployment
1. Confirm the API returns `{ success: true, id: "...", slug: "...", checksCount: N }`
2. Call `GET /v1/internal/dynamic-integrations` and verify the integration appears with correct data
3. Check that all check definitions have correct paths, scopes, and variables

### Step 7: Post-Integration Report
After completing, report to the user:

**What was done:**
- Integration name, slug, number of checks
- Which evidence tasks each check maps to
- Full list of API endpoints used with confidence levels

**What the user needs to do (step by step):**
1. **OAuth app setup** (if needed):
   - Where to register: provide exact URL
   - Which scopes to add as **Delegated** permissions (list each one)
   - Grant admin consent
   - Add redirect URI: `https://api.trycomp.ai/v1/integrations/oauth/callback`
2. **Admin panel setup:**
   - Go to `/admin/integrations`
   - Find the integration
   - Enter client ID + client secret from the OAuth app
3. **Provider-specific setup** (if any):
   - e.g., "Enable Identity Platform in Firebase Console"
   - e.g., "Assign Intune license to the user account"
4. **Test:**
   - Connect the integration
   - Enter any required variables (list them with example values)
   - Run each check and verify results

**Complexity assessment:**
- 🟢 Simple: API key auth, no approval needed (e.g., SendGrid, Datadog)
- 🟡 Medium: OAuth with existing provider (e.g., Google services — reuse existing Google OAuth app)
- 🔴 Complex: OAuth requiring new app registration + provider approval process (e.g., Rippling, Salesforce)

## Provider-Specific Rules (from production experience)

### Google / Firebase / GCP
- Authorize: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- **ALWAYS** add `"authorizationParams": {"access_type": "offline", "prompt": "consent"}`
- Scopes are full URLs: `https://www.googleapis.com/auth/firebase.readonly`
- Supports PKCE
- Google app needs verification for external users (or add test users manually)
- Firebase needs Identity Platform upgrade for admin APIs

### Microsoft Graph (Office 365, Intune, Azure AD)
- Authorize: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- Token: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
- **Use EXPLICIT scopes** — do NOT use `.default` (it fails for Intune)
- Scopes must be added as **Delegated** (not Application) in Azure app
- Grant admin consent after adding permissions
- Pagination: `@odata.nextLink` returns full URL — our cursor handler follows it automatically
- Always use full URLs in paths: `https://graph.microsoft.com/v1.0/endpoint`
- Intune APIs need an Intune license on the connecting account
- Personal Microsoft accounts (MSA) don't support admin APIs — need work/school accounts

### Azure DevOps
- Authorize: `https://app.vssps.visualstudio.com/oauth2/authorize`
- Token: `https://app.vssps.visualstudio.com/oauth2/token`
- Base URL: `https://dev.azure.com`
- Requires `organization` variable (user provides their org name)
- Scopes: `vso.code`, `vso.build`, `vso.project`

## DSL Reference

### Available Step Types:

**fetch** — Single API call:
```json
{ "type": "fetch", "path": "https://api.example.com/v1/endpoint", "as": "varName", "dataPath": "response.data", "onError": "fail|skip|empty" }
```

**fetchPages** — Paginated API call:
```json
{
  "type": "fetchPages", "path": "https://api.example.com/v1/endpoint", "as": "varName",
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
  "steps": [{ "type": "fetch", "path": "https://api.example.com/v1/details/{{item.id}}", "as": "detail" }],
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
- Use relative paths — always use full URLs in check definitions
- Use `.default` scope for Microsoft — use explicit scopes
- Use `params` field for `$`-prefixed query params
- Skip the pre-deployment validation checklist
- Create JSON files in the codebase
- Seed directly to DB — always use the API

**DO:**
- Use the PUT upsert endpoint for all integration creation/updates
- Use full URLs in all fetch/fetchPages paths
- Use correct OAuth2 scopes (least privilege, explicit, Delegated)
- Handle pagination correctly for each API's specific strategy
- Write remediation that references actual UI navigation paths
- Always define variables when checks need user config
- Name checks to match the evidence task name
- Add trailing slash to base URLs with path components
- Include `access_type: offline` for all Google OAuth integrations
- Run the pre-deployment validation checklist before every deploy
- Report step-by-step what the user needs to do manually
