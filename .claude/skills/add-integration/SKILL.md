---
name: add-integration
description: Build a dynamic integration for the CompAI platform using the integration DSL
disable-model-invocation: true
---

You are a **Principal Integration Engineer** building a dynamic integration for the CompAI platform.

**Before starting:** Read `.claude/skills/add-integration/examples.md` for production-tested examples. Also call `GET /v1/internal/dynamic-integrations` to see existing integrations as reference.

## Workflow

### Step 1: Research the API
- Find official REST API docs for $ARGUMENTS
- Identify: base URL, API version, auth method (OAuth2 scopes, API key header)
- Find exact endpoint paths and response schemas
- Identify pagination strategy (page numbers, cursors, Link headers, `@odata.nextLink`)
- Note rate limits
- State confidence for each endpoint: ✅ Verified, 🟡 Likely, ❌ Unverified

### Step 2: Identify Relevant Checks
Map to evidence tasks. **Use the task name as the check name.**

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
Define user-provided config (project IDs, org names, tenant IDs, domains).
Format: `{ id, label, type, required, helpText, placeholder }`
Types: `text`, `number`, `boolean`, `select`, `multi-select`
Reference as `{{variables.project_id}}`

Common: Google/Firebase → `project_id`, Azure DevOps → `organization`, Microsoft 365/Intune → none, Slack/GitHub → none

### Step 4: Pre-Deployment Validation (MANDATORY)

**JSON structure:**
- [ ] `capabilities` is `["checks"]` NOT `{"checks"}`
- [ ] `defaultHeaders` is `{}` — valid JSON object

**Base URL:**
- [ ] Trailing slash if URL has path component: `https://api.example.com/v1.0/`

**API paths:**
- [ ] **ALWAYS use full URLs** in fetch/fetchPages paths: `https://graph.microsoft.com/v1.0/deviceManagement/...`
- [ ] NEVER start paths with `/`
- [ ] OData `$select` params go directly in the path URL, NOT in `params`

**OAuth config:**
- [ ] Google: `"authorizationParams": {"access_type": "offline", "prompt": "consent"}`
- [ ] Microsoft: use EXPLICIT scopes, NOT `.default` (fails for Intune)
- [ ] Microsoft: scopes must be **Delegated** (not Application) in Azure app
- [ ] `supportsRefreshToken: true`

**Checks:**
- [ ] Every check has `variables` array with required user inputs
- [ ] `onFail` has real remediation with actual UI paths
- [ ] Check names match evidence task names exactly

### Step 5: Deploy via API
- Upsert: `PUT /v1/internal/dynamic-integrations`
- Auth: `X-Internal-Token` header
- Base URL: `http://localhost:3333` (local) or production

Other endpoints: `GET` (list/detail), `PATCH` (update), `DELETE`, `POST .../activate`, `POST .../deactivate`

### Step 6: Verify
- Confirm `{ success: true, id, slug, checksCount }`
- Call `GET /v1/internal/dynamic-integrations` to verify data

### Step 7: Post-Integration Report
**What was done:** integration name, slug, checks, task mappings
**What user needs to do (step by step):**
1. OAuth app: where to register, which Delegated scopes, grant admin consent, redirect URI `https://api.trycomp.ai/v1/integrations/oauth/callback`
2. Admin panel: `/admin/integrations` → enter client ID + secret
3. Provider-specific: e.g., enable Identity Platform, assign Intune license
4. Test: connect, enter variables, run each check

**Complexity:** 🟢 Simple (API key) | 🟡 Medium (existing OAuth provider) | 🔴 Complex (new OAuth app + approval)

## Provider-Specific Rules

### Google / Firebase / GCP
- Authorize: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- **ALWAYS** `"authorizationParams": {"access_type": "offline", "prompt": "consent"}`
- Scopes are full URLs: `https://www.googleapis.com/auth/firebase.readonly`
- Needs Google app verification for external users
- Firebase needs Identity Platform upgrade for admin APIs

### Microsoft Graph (Office 365, Intune, Azure AD)
- Authorize: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- Token: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
- **Use EXPLICIT scopes** — do NOT use `.default`
- Add `offline_access`, `openid`, `profile` to scopes
- Scopes must be **Delegated** in Azure app + grant admin consent
- Always use full URLs in paths: `https://graph.microsoft.com/v1.0/endpoint`
- Pagination: `@odata.nextLink` returns full URL — cursor handler follows it
- Intune needs Intune license on connecting account
- Personal accounts (MSA) don't support admin APIs

### Azure DevOps
- Authorize: `https://app.vssps.visualstudio.com/oauth2/authorize`
- Token: `https://app.vssps.visualstudio.com/oauth2/token`
- Base URL: `https://dev.azure.com`
- Requires `organization` variable
- Scopes: `vso.code`, `vso.build`, `vso.project`

## DSL Reference

### Step Types
- **fetch**: `{ type: "fetch", path: "https://full-url/endpoint", as: "varName", dataPath: "data", onError: "fail|skip|empty" }`
- **fetchPages**: `{ type: "fetchPages", path: "https://full-url/endpoint", as: "varName", pagination: { strategy: "cursor", cursorParam, cursorPath, dataPath } }`
- **forEach**: Iterate collection with filter, conditions, nested steps, onPass/onFail
- **aggregate**: Count/sum threshold with countWhere operation
- **branch**: Conditional with then/else step arrays
- **emit**: Direct pass/fail with template

### Operators
`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `exists`, `notExists`, `truthy`, `falsy`, `contains`, `matches`, `in`, `age_within_days`, `age_exceeds_days`

### Logical: `and`, `or`, `not`
### Templates: `{{item.field}}`, `{{variables.project_id}}`, `{{now}}`

## Quality Standards
**DO NOT:** guess endpoints, use relative paths, use `.default` for Microsoft, skip validation checklist, forget variables, create JSON files, seed directly to DB
**DO:** use full URLs in all paths, PUT upsert endpoint, explicit OAuth scopes, proper pagination, real remediation with UI paths, match check names to task names, run validation checklist before deploy
