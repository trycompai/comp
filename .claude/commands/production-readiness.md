# Production Readiness — Audit & Fix All

Run a comprehensive production readiness check by executing all four audit commands against the target, then verifying the entire monorepo builds and tests pass.

## Process

Execute these 4 skills **in parallel** against the target path. Each one finds and fixes issues automatically:

1. `/audit-rbac $ARGUMENTS`
2. `/audit-hooks $ARGUMENTS`
3. `/audit-design-system $ARGUMENTS`
4. `/audit-tests $ARGUMENTS`

After all 4 complete, run **full monorepo** build and test verification:

```bash
bun run build
bun run test
```

If anything fails, **fix it**.

## Final Output

Report a summary:

```
## Production Readiness Report

### Fixes Applied
- RBAC: X issues fixed (list them)
- Hooks: X issues fixed (list them)
- Design System: X components migrated (list them)
- Tests: X tests written, Y tests fixed

### Build Status
- All apps: PASS/FAIL
- All tests: X passing, Y failing
```

## Target

$ARGUMENTS
