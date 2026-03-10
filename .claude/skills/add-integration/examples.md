# Dynamic Integration Examples

Reference examples from production. Use these as templates when building new integrations.

## Example 1: Firebase (Google OAuth)

**Auth:** Google OAuth2 with PKCE, offline access for token refresh
**Variables:** `project_id` (user provides their Firebase project ID)
**Checks:** 3 checks mapping to 2FA, Employee Access, Encryption at Rest

```json
{
  "slug": "firebase",
  "name": "Firebase",
  "description": "Monitor Firebase Authentication MFA settings, user access, and security rules",
  "category": "Cloud",
  "logoUrl": "https://www.vectorlogo.zone/logos/firebase/firebase-icon.svg",
  "docsUrl": "https://firebase.google.com/docs/reference/rest",
  "baseUrl": "https://identitytoolkit.googleapis.com/",
  "defaultHeaders": {},
  "authConfig": {
    "type": "oauth2",
    "config": {
      "authorizeUrl": "https://accounts.google.com/o/oauth2/v2/auth",
      "tokenUrl": "https://oauth2.googleapis.com/token",
      "scopes": [
        "https://www.googleapis.com/auth/identitytoolkit",
        "https://www.googleapis.com/auth/firebase.readonly"
      ],
      "pkce": true,
      "supportsRefreshToken": true,
      "clientAuthMethod": "body",
      "authorizationParams": { "access_type": "offline", "prompt": "consent" }
    }
  },
  "capabilities": ["checks"],
  "checks": [
    {
      "checkSlug": "mfa_config",
      "name": "2FA",
      "description": "Verifies that multi-factor authentication is enabled at the Firebase project level",
      "taskMapping": "frk_tt_68406cd9dde2d8cd4c463fe0",
      "defaultSeverity": "high",
      "definition": {
        "steps": [
          {
            "type": "fetch",
            "path": "admin/v2/projects/{{variables.project_id}}/config",
            "as": "config",
            "onError": "fail"
          },
          {
            "type": "branch",
            "condition": {
              "op": "or",
              "conditions": [
                { "field": "config.mfa.state", "operator": "eq", "value": "ENABLED" },
                { "field": "config.mfa.state", "operator": "eq", "value": "MANDATORY" }
              ]
            },
            "then": [
              {
                "type": "emit",
                "result": "pass",
                "template": {
                  "title": "MFA is enabled for Firebase project",
                  "description": "Multi-factor authentication is set to {{config.mfa.state}}",
                  "resourceType": "firebase-project",
                  "resourceId": "{{variables.project_id}}"
                }
              }
            ],
            "else": [
              {
                "type": "emit",
                "result": "fail",
                "template": {
                  "title": "MFA is not enabled for Firebase project",
                  "description": "MFA state is {{config.mfa.state}}. Should be ENABLED or MANDATORY.",
                  "resourceType": "firebase-project",
                  "resourceId": "{{variables.project_id}}",
                  "severity": "high",
                  "remediation": "Go to Firebase Console > Authentication > Sign-in method > Multi-factor authentication > Enable MFA."
                }
              }
            ]
          }
        ]
      },
      "variables": [
        {
          "id": "project_id",
          "label": "Firebase Project ID",
          "type": "text",
          "required": true,
          "helpText": "Found in Firebase Console > Project Settings",
          "placeholder": "my-firebase-project"
        }
      ]
    },
    {
      "checkSlug": "user_access",
      "name": "Employee Access",
      "description": "Reviews Firebase Authentication users and MFA enrollment",
      "taskMapping": "frk_tt_68406ca292d9fffb264991b9",
      "defaultSeverity": "medium",
      "definition": {
        "steps": [
          {
            "type": "fetchPages",
            "path": "v1/projects/{{variables.project_id}}/accounts:batchGet",
            "as": "users",
            "pagination": {
              "strategy": "cursor",
              "cursorParam": "nextPageToken",
              "cursorPath": "nextPageToken",
              "dataPath": "users"
            },
            "params": { "maxResults": "100" },
            "onError": "fail"
          },
          {
            "type": "forEach",
            "collection": "users",
            "itemAs": "user",
            "resourceType": "user",
            "resourceIdPath": "user.email",
            "filter": {
              "op": "and",
              "conditions": [
                { "field": "user.email", "operator": "exists" },
                { "field": "user.disabled", "operator": "neq", "value": true }
              ]
            },
            "conditions": [
              { "field": "user.mfaInfo.length", "operator": "gt", "value": 0 }
            ],
            "onPass": {
              "title": "MFA enrolled: {{user.email}}",
              "description": "{{user.displayName}} has MFA configured",
              "resourceType": "user",
              "resourceId": "{{user.email}}"
            },
            "onFail": {
              "title": "No MFA enrolled: {{user.email}}",
              "description": "{{user.displayName}} has no MFA methods enrolled",
              "resourceType": "user",
              "resourceId": "{{user.email}}",
              "severity": "medium",
              "remediation": "Enable MFA at project level, then user can enroll via the app."
            }
          }
        ]
      },
      "variables": [
        {
          "id": "project_id",
          "label": "Firebase Project ID",
          "type": "text",
          "required": true,
          "helpText": "Found in Firebase Console > Project Settings",
          "placeholder": "my-firebase-project"
        }
      ]
    }
  ]
}
```

**Key patterns in this example:**
- `authorizationParams` with `access_type: offline` — required for Google
- `baseUrl` has trailing slash — paths are relative to it
- Security Rules check uses full URL for a different API domain (`firebaserules.googleapis.com`)
- `branch` step for simple pass/fail on a single value
- `fetchPages` with cursor pagination for user listing
- `forEach` with `filter` to skip disabled users
- Variables defined on each check for `project_id`

---

## Example 2: Microsoft Intune (Microsoft Graph OAuth)

**Auth:** Microsoft OAuth2 with explicit scopes (NOT `.default`)
**Variables:** None (tenant determined from OAuth)
**Checks:** 3 checks using full URLs to Microsoft Graph API

```json
{
  "slug": "intune",
  "name": "Microsoft Intune",
  "description": "Monitor device compliance and enrollment status",
  "category": "Security",
  "logoUrl": "https://img.logo.dev/microsoft.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ",
  "baseUrl": "https://graph.microsoft.com/v1.0/",
  "defaultHeaders": {},
  "authConfig": {
    "type": "oauth2",
    "config": {
      "authorizeUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      "tokenUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      "scopes": [
        "DeviceManagementManagedDevices.Read.All",
        "DeviceManagementConfiguration.Read.All",
        "ServiceHealth.Read.All",
        "offline_access",
        "openid",
        "profile"
      ],
      "pkce": true,
      "supportsRefreshToken": true,
      "clientAuthMethod": "body"
    }
  },
  "capabilities": ["checks"],
  "checks": [
    {
      "checkSlug": "device_compliance",
      "name": "Device Compliance Status",
      "description": "Checks that all Intune-managed devices are compliant",
      "taskMapping": "frk_tt_6840796f77d8a0dff53f947a",
      "defaultSeverity": "high",
      "definition": {
        "steps": [
          {
            "type": "fetchPages",
            "path": "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$select=id,deviceName,complianceState,isEncrypted,operatingSystem,osVersion,userPrincipalName,userDisplayName,lastSyncDateTime",
            "as": "devices",
            "pagination": {
              "strategy": "cursor",
              "cursorParam": "$skiptoken",
              "cursorPath": "@odata.nextLink",
              "dataPath": "value"
            },
            "onError": "fail"
          },
          {
            "type": "forEach",
            "collection": "devices",
            "itemAs": "device",
            "resourceType": "device",
            "resourceIdPath": "device.deviceName",
            "conditions": [
              { "field": "device.complianceState", "operator": "eq", "value": "compliant" }
            ],
            "onPass": {
              "title": "Device compliant: {{device.deviceName}}",
              "description": "{{device.operatingSystem}} {{device.osVersion}} — {{device.userDisplayName}}",
              "resourceType": "device",
              "resourceId": "{{device.deviceName}}"
            },
            "onFail": {
              "title": "Device non-compliant: {{device.deviceName}}",
              "description": "{{device.operatingSystem}} device is {{device.complianceState}}",
              "resourceType": "device",
              "resourceId": "{{device.deviceName}}",
              "severity": "high",
              "remediation": "Go to Intune admin center (https://intune.microsoft.com) > Devices > select device > Review compliance status."
            }
          }
        ]
      },
      "variables": []
    }
  ]
}
```

**Key patterns in this example:**
- Microsoft scopes are EXPLICIT, not `.default`
- Includes `offline_access`, `openid`, `profile` for token refresh
- **Full URL in path** — `https://graph.microsoft.com/v1.0/deviceManagement/...` (most important pattern)
- `@odata.nextLink` pagination — returns full URL, our cursor handler follows it
- `$select` OData params directly in the path URL
- No variables needed — Microsoft tenant is determined from OAuth token

---

## Common Patterns

### Simple config check (pass/fail on a single setting)
```json
{
  "type": "fetch", "path": "https://api.example.com/v1/settings", "as": "settings"
},
{
  "type": "branch",
  "condition": { "field": "settings.mfa_enabled", "operator": "eq", "value": true },
  "then": [{ "type": "emit", "result": "pass", "template": { ... } }],
  "else": [{ "type": "emit", "result": "fail", "template": { ... } }]
}
```

### Per-user check (iterate users, check each)
```json
{
  "type": "fetchPages", "path": "https://api.example.com/v1/users", "as": "users",
  "pagination": { "strategy": "cursor", "cursorParam": "page_token", "cursorPath": "next_token", "dataPath": "data" }
},
{
  "type": "forEach", "collection": "users", "itemAs": "user",
  "resourceType": "user", "resourceIdPath": "user.email",
  "conditions": [{ "field": "user.mfa_enabled", "operator": "eq", "value": true }],
  "onPass": { "title": "MFA on: {{user.email}}", ... },
  "onFail": { "title": "MFA off: {{user.email}}", "severity": "high", "remediation": "...", ... }
}
```

### Threshold check (count items matching criteria)
```json
{
  "type": "fetch", "path": "https://api.example.com/v1/issues", "as": "issues", "dataPath": "items"
},
{
  "type": "aggregate", "collection": "issues", "operation": "countWhere",
  "filter": { "field": "severity", "operator": "in", "value": ["critical", "high"] },
  "condition": { "operator": "lte", "value": 5 },
  "onPass": { "title": "Critical issues within threshold", ... },
  "onFail": { "title": "Too many critical issues", "severity": "high", ... }
}
```

### Empty collection handling
```json
{
  "type": "fetch", "path": "https://api.example.com/v1/rules", "as": "rulesResponse"
},
{
  "type": "branch",
  "condition": { "field": "rulesResponse.rules.length", "operator": "gt", "value": 0 },
  "then": [
    { "type": "forEach", "collection": "rulesResponse.rules", ... }
  ],
  "else": [
    { "type": "emit", "result": "fail", "template": { "title": "No rules configured", ... } }
  ]
}
```
