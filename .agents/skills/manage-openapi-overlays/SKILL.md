---
name: manage-openapi-overlays
description: Use when creating, applying, or validating overlay files including x-speakeasy extensions. Covers overlay syntax, JSONPath targeting, retries, pagination, naming, grouping, open enums, global headers, custom security. Triggers on "create overlay", "apply overlay", "overlay file", "x-speakeasy", "add extension", "configure retries", "add pagination", "overlay for retries".
license: Apache-2.0
---

# manage-openapi-overlays

Overlays let you customize an OpenAPI spec for SDK generation without modifying the source. This skill covers creating overlay files, applying them to specs, and using them to fix validation errors.

## Content Guides

| Topic | Guide |
|-------|-------|
| OpenAPI Validation | [content/validation.md](content/validation.md) |
| Security Schemes | [content/security-schemes.md](content/security-schemes.md) |

These guides cover validating specs, fixing common issues, and configuring authentication methods.

## Authentication

Set `SPEAKEASY_API_KEY` env var or run `speakeasy auth login`.

## When to Use

Use this skill when you need to **manually work with overlay files**:

- Creating an overlay file from scratch with specific JSONPath targets
- Applying an existing overlay file to a spec
- Validating overlay syntax and structure
- Comparing two specs to generate an overlay
- Understanding overlay mechanics (actions, targets, update/remove)
- Fixing lint issues via manual overlay creation
- User says: "create overlay", "apply overlay", "overlay file", "manual overlay", "overlay syntax", "JSONPath targeting", "validate overlay"

**NOT for**: AI-powered naming suggestions (see `improve-sdk-naming` instead)

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Target spec | Yes | OpenAPI spec to customize or fix |
| Customizations | Depends | Changes to apply (groups, names, retries, descriptions) |
| Overlay file | Depends | Existing overlay to apply (for apply workflow) |
| Lint output | Helpful | Validation errors to fix (for fix workflow) |

## Outputs

| Output | Description |
|--------|-------------|
| Overlay file | YAML file with JSONPath-targeted changes |
| Modified spec | Transformed OpenAPI spec (when applying) |

## Commands

### Generate an Overlay by Comparing Specs

```bash
speakeasy overlay compare -b <before-spec> -a <after-spec> -o <output-overlay>
```

Use this when you have a modified version of a spec and want to capture the differences as a reusable overlay.

### Apply an Overlay to a Spec

```bash
speakeasy overlay apply -s <spec-path> -o <overlay-path> --out <output-path>
```

### Validate an Overlay

```bash
speakeasy overlay validate -o <overlay-path>
```

## Creating an Overlay Manually

Create an overlay file with this structure:

```yaml
overlay: 1.0.0
info:
  title: My Overlay
  version: 1.0.0
actions:
  - target: "$.paths['/example'].get"
    update:
      x-speakeasy-group: example
      x-speakeasy-name-override: getExample
```

Each action has a `target` (JSONPath expression) and an `update` (object to merge) or `remove` (boolean to delete the target).

## Example: SDK Method Naming and Grouping

```yaml
overlay: 1.0.0
info:
  title: SDK Customizations
  version: 1.0.0
actions:
  - target: "$.paths['/users'].get"
    update:
      x-speakeasy-group: users
      x-speakeasy-name-override: list
  - target: "$.paths['/users'].post"
    update:
      x-speakeasy-group: users
      x-speakeasy-name-override: create
  - target: "$.paths['/users/{id}'].get"
    update:
      x-speakeasy-group: users
      x-speakeasy-name-override: get
  - target: "$.paths['/users/{id}'].delete"
    update:
      x-speakeasy-group: users
      x-speakeasy-name-override: delete
      deprecated: true
```

This produces SDK methods: `sdk.users.list()`, `sdk.users.create()`, `sdk.users.get()`, `sdk.users.delete()`.

## Example: Apply Overlay

```bash
# Apply overlay and write merged spec
speakeasy overlay apply -s openapi.yaml -o sdk-overlay.yaml --out openapi-modified.yaml

# Compare two specs to generate an overlay
speakeasy overlay compare -b original.yaml -a modified.yaml -o changes-overlay.yaml
```

## Using in Workflow (Recommended)

Instead of applying overlays manually, add them to `.speakeasy/workflow.yaml`:

```yaml
sources:
  my-api:
    inputs:
      - location: ./openapi.yaml
    overlays:
      - location: ./naming-overlay.yaml
      - location: ./grouping-overlay.yaml
```

Overlays are applied in order. Later overlays can override earlier ones. This approach ensures overlays are always applied during `speakeasy run`.

## Common Fix Patterns

Use overlays to fix validation issues when you cannot edit the source spec.

| Issue | Overlay Fix |
|-------|-------------|
| Poor operation names | Add `x-speakeasy-name-override` to the operation |
| Missing descriptions | Add `summary` or `description` to the operation |
| Missing tags | Add `tags` array to the operation |
| Need operation grouping | Add `x-speakeasy-group` to operations |
| Need retry config | Add `x-speakeasy-retries` to operations or globally |
| Deprecate an endpoint | Add `deprecated: true` to the operation |
| Add SDK-specific metadata | Add any `x-speakeasy-*` extension |

### Fix Workflow

```bash
# 1. Validate the spec to identify issues
speakeasy lint openapi --non-interactive -s openapi.yaml

# 2. Create an overlay file targeting each issue (see patterns above)

# 3. Add overlay to workflow.yaml under sources.overlays

# 4. Regenerate the SDK
speakeasy run --output console
```

## Speakeasy Extensions Reference

Extensions (`x-speakeasy-*`) customize SDK generation. Apply them via overlays.

| Extension | Applies To | Purpose |
|-----------|-----------|---------|
| `x-speakeasy-retries` | Operation or root | Configure retry behavior |
| `x-speakeasy-pagination` | Operation | Enable automatic pagination |
| `x-speakeasy-name-override` | Operation | Override SDK method name |
| `x-speakeasy-group` | Operation | Group methods under namespace |
| `x-speakeasy-unknown-values` | Schema with enum | Allow unknown enum values |
| `x-speakeasy-globals` | Root | Define SDK-wide parameters |
| `x-speakeasy-custom-security-scheme` | Security scheme | Multi-part custom auth |

### Retries

```yaml
actions:
  - target: "$.paths['/resources'].get"  # Or "$" for global
    update:
      x-speakeasy-retries:
        strategy: backoff
        backoff:
          initialInterval: 500      # ms
          maxInterval: 60000        # ms
          maxElapsedTime: 3600000   # ms
          exponent: 1.5
        statusCodes: ["5XX", "429"]
        retryConnectionErrors: true
```

### Pagination

**Offset/Limit:**
```yaml
actions:
  - target: "$.paths['/users'].get"
    update:
      x-speakeasy-pagination:
        type: offsetLimit
        inputs:
          - name: offset
            in: parameters
            type: offset
          - name: limit
            in: parameters
            type: limit
        outputs:
          results: $.data
          numPages: $.meta.total_pages
```

**Cursor:**
```yaml
actions:
  - target: "$.paths['/events'].get"
    update:
      x-speakeasy-pagination:
        type: cursor
        inputs:
          - name: cursor
            in: parameters
            type: cursor
        outputs:
          results: $.events
          nextCursor: $.next_cursor
```

### Open Enums (Anti-Fragility)

Prevent SDK breakage when APIs return new enum values:

```yaml
actions:
  - target: "$.components.schemas.Status"
    update:
      x-speakeasy-unknown-values: allow
```

For all enums (add `x-speakeasy-jsonpath: rfc9535` at overlay root):
```yaml
actions:
  - target: $..[?length(@.enum) > 1]
    update:
      x-speakeasy-unknown-values: allow
```

### Global Headers

Add SDK-wide headers as constructor options:

```yaml
actions:
  - target: $
    update:
      x-speakeasy-globals:
        parameters:
          - $ref: "#/components/parameters/TenantId"
  - target: $.components
    update:
      parameters:
        TenantId:
          name: X-Tenant-Id
          in: header
          schema:
            type: string
```

Result: `client = SDK(api_key="...", tenant_id="tenant-123")`

### Custom Security Schemes

For complex auth (HMAC, multi-part credentials):

```yaml
actions:
  - target: $.components
    update:
      securitySchemes:
        hmacAuth:
          type: http
          scheme: custom
          x-speakeasy-custom-security-scheme:
            schema:
              type: object
              properties:
                keyId:
                  type: string
                keySecret:
                  type: string
  - target: $
    update:
      security:
        - hmacAuth: []
```

With `envVarPrefix: MYAPI` in gen.yaml, generates env var support for `MYAPI_KEY_ID`, `MYAPI_KEY_SECRET`.

## JSONPath Targeting Reference

| Target | Selects |
|--------|---------|
| `$.paths['/users'].get` | GET /users operation |
| `$.paths['/users/{id}'].*` | All operations on /users/{id} |
| `$.paths['/users'].get.parameters[0]` | First parameter of GET /users |
| `$.components.schemas.User` | User schema definition |
| `$.components.schemas.User.properties.name` | Name property of User schema |
| `$.info` | API info object |
| `$.info.title` | API title |
| `$.servers[0]` | First server entry |

## What NOT to Do

- **Do NOT** use overlays for invalid YAML/JSON syntax errors -- fix the source file
- **Do NOT** try to fix broken `$ref` paths with overlays -- fix the source spec
- **Do NOT** use overlays to fix wrong data types -- this is an API design issue
- **Do NOT** try to deduplicate schemas with overlays -- requires structural analysis
- **Do NOT** ignore errors that require source spec fixes -- overlays cannot solve everything
- **Do NOT** modify source OpenAPI specs directly if they are externally managed
- **Do NOT** use a `speakeasy overlay create` command -- it does not exist

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "target not found" | JSONPath does not match spec structure | Verify exact path and casing by inspecting the spec |
| Changes not applied | Overlay not in workflow | Add overlay to `sources.overlays` in `workflow.yaml` |
| "invalid overlay" | Malformed YAML | Check overlay structure: needs `overlay`, `info`, `actions` |
| YAML parse error | Invalid overlay syntax | Check YAML indentation and quoting |
| No changes visible | Wrong target path | Use `$.paths['/exact-path']` with exact casing |
| Errors persist after overlay | Issue not overlay-appropriate | Check if the issue requires a source spec fix instead |
| Overlay order conflict | Later overlay overrides earlier | Reorder overlays in `workflow.yaml` or merge into one file |

## After Making Changes

After creating or modifying overlay files and adding them to workflow.yaml, **prompt the user** to regenerate the SDK:

> **Overlay configuration complete.** Would you like to regenerate the SDK now with `speakeasy run`?

If the user confirms, run:

```bash
speakeasy run --output console
```

Overlay changes only take effect in the SDK after regeneration.
