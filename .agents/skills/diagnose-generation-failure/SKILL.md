---
name: diagnose-generation-failure
description: Use when SDK generation failed or seeing errors. Triggers on "generation failed", "speakeasy run failed", "SDK build error", "workflow failed", "Step Failed", "why did generation fail"
license: Apache-2.0
---

# diagnose-generation-failure

When SDK generation fails, diagnose the root cause and determine the fix strategy.

## When to Use

- `speakeasy run` failed with errors
- SDK generation produced unexpected results
- User says: "generation failed", "SDK build error", "why did generation fail"

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| OpenAPI spec | Yes | Path to spec that failed generation |
| Error output | Helpful | Error messages from failed run |

## Outputs

| Output | Description |
|--------|-------------|
| Diagnosis | Root cause of failure |
| Fix strategy | Overlay vs spec fix vs user decision |
| Action items | Specific steps to resolve |

## Diagnosis Steps

1. **Run lint to get detailed errors:**
   ```bash
   speakeasy lint openapi --non-interactive -s <spec-path>
   ```

2. **Categorize issues:**
   - **Fixable with overlays:** Missing descriptions, poor operation IDs
   - **Requires spec fix:** Invalid schema, missing required fields
   - **Requires user input:** Design decisions, authentication setup

## Decision Framework

| Issue Type | Fix Strategy | Example |
|------------|--------------|---------|
| Missing operationId | Overlay | Use `speakeasy suggest operation-ids` |
| Missing description | Overlay | Add via overlay |
| Invalid $ref | **Ask user** | Broken reference needs spec fix |
| Circular reference | **Ask user** | Design decision needed |
| Missing security | **Ask user** | Auth design needed |

## What NOT to Do

- **Do NOT** disable lint rules to hide errors
- **Do NOT** try to fix every issue one-by-one
- **Do NOT** modify source spec without asking
- **Do NOT** assume you can fix structural problems

## Troubleshooting Tree

```
PROBLEM
  │
  ├─ ResponseValidationError at runtime?
  │    └─ SDK types don't match server responses
  │         ├─ Run contract tests to identify mismatches
  │         └─ Fix spec or create overlay to correct types
  │
  ├─ SDK doesn't match live API behavior?
  │    ├─ Spec may have drifted from API
  │    │    → Run contract tests to detect drift
  │    └─ Third-party spec may be inaccurate
  │         → Validate with contract testing before trusting
  │
  ├─ Type mismatch errors in generated SDK?
  │    ├─ At compile time → Check spec schema definitions
  │    └─ At runtime → Server returns unexpected types
  │                    → Contract testing required
  │
  └─ Enum value not recognized?
       └─ API returned value not in spec enum
            ├─ Add missing value to spec/overlay
            └─ Or use open enums for anti-fragility
```

## Working with Large OpenAPI Specs

Use `yq` (YAML) or `jq` (JSON) to inspect specs without loading full content:

```bash
# List all paths
yq '.paths | keys' spec.yaml

# Inspect a specific endpoint
yq '.paths["/users/{id}"]' spec.yaml

# List all schema names
yq '.components.schemas | keys' spec.yaml

# List all operationIds
yq '[.paths[][].operationId // empty] | unique' spec.yaml
```

## Strategy Document

For complex issues, produce a document:

```markdown
## OpenAPI Spec Analysis

### Blocking Issues (require user input)
- [List issues that need human decision]

### Fixable Issues (can use overlays)
- [List issues with proposed overlay fixes]

### Recommended Approach
[Your recommendation]
```

## Related Skills

- `manage-openapi-overlays` - Fix issues with overlays
- `setup-sdk-testing` - Contract testing for validation
- `writing-openapi-specs` - Spec design best practices
