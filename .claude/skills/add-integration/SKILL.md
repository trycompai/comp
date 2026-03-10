---
name: add-integration
description: Build a dynamic integration for the CompAI platform using the integration DSL
disable-model-invocation: true
---

You are a **Principal Integration Engineer** building a dynamic integration for the CompAI platform.

## Workflow

### Step 1: Research the API
- Find official REST API docs for $ARGUMENTS
- Identify: base URL, API version, auth method (OAuth2 scopes, API key header)
- Find exact endpoint paths and response schemas
- Identify pagination strategy (page numbers, cursors, Link headers, `@odata.nextLink`)
- Note rate limits
- State confidence for each endpoint: ✅ Verified, 🟡 Likely, ❌ Unverified

### Step 2: Identify Relevant Checks
Map service type to compliance evidence tasks. Available task IDs:
`two_factor_authentication`, `employee_access`, `rbac`, `password_policy`, `antivirus`, `encryption`, `firewall`, `logging`, `access_review`, `vulnerability_scanning`, `change_management`, `incident_response`, `data_backup`, `disaster_recovery`, `network_security`, `endpoint_protection`, `data_classification`, `security_awareness`, `third_party_risk`, `business_continuity`, `physical_security`, `asset_management`, `patch_management`, `code_review`, `penetration_testing`, `compliance_monitoring`, `risk_assessment`

### Step 3: Identify Required Variables
Define user-provided config needed by checks (project IDs, org names, tenant IDs, domains).
Format: `{ id, label, type, required, helpText, placeholder }`
Types: `text`, `number`, `boolean`, `select`, `multi-select`
Reference in checks as `{{variables.project_id}}`

### Step 4: Deploy via API
- Upsert endpoint: `PUT /v1/internal/dynamic-integrations`
- Auth: `X-Internal-Token` header
- Base URL: `http://localhost:3333` (local) or production

### Step 5: Verify
- Confirm API returns `{ success: true, id, slug, checksCount }`
- Tell user to restart API server or wait 60 seconds

### Step 6: Post-Integration Report
- What was done (integration name, slug, check mappings)
- What user needs to do (OAuth creds, register app, scopes, redirect URI)
- Complexity assessment (Simple/Medium/Complex)

## Important Lessons
- Base URL trailing slash for paths: `https://graph.microsoft.com/v1.0/`
- Google OAuth: always include `access_type: offline` for refresh tokens
- Google OAuth endpoints: authorize at accounts.google.com, token at oauth2.googleapis.com
- Microsoft Graph: use `https://graph.microsoft.com/.default` scope and `@odata.nextLink` for pagination
- Don't use `$` in query params via `params` field — put in path directly
- Handle empty API responses when using `branch`

## DSL Reference

### Step Types
- **fetch**: Single API call with optional `dataPath`, `params`, `onError`
- **fetchPages**: Paginated call with `pagination` strategy (`cursor`, `page`, `link`)
- **forEach**: Iterate collection with conditions and sub-steps
- **aggregate**: Count/sum threshold with `countWhere` operation
- **branch**: Conditional logic with `then`/`else`
- **emit**: Direct pass/fail with template

### Expression Operators
`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `exists`, `notExists`, `truthy`, `falsy`, `contains`, `matches`, `in`, `age_within_days`, `age_exceeds_days`

### Logical Operators
`and`, `or`, `not`

### Template Variables
`{{item.field}}`, `{{variables.project_id}}`, `{{now}}`

## Quality Standards
- DO NOT guess endpoints, use placeholder URLs, skip pagination, write vague remediation, forget variables, create JSON in codebase, seed to DB
- DO use PUT upsert endpoint, correct OAuth2 scopes (least privilege), proper pagination per API, specific remediation with UI paths, define variables, match check names to evidence tasks
