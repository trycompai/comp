---
name: production-readiness
description: Run all audit checks (RBAC, hooks, design system, tests) and verify build
disable-model-invocation: true
---

Run a comprehensive production readiness check on $ARGUMENTS.

Use parallel subagents to run all four audits simultaneously:
1. audit-rbac on $ARGUMENTS
2. audit-hooks on $ARGUMENTS
3. audit-design-system on $ARGUMENTS
4. audit-tests on $ARGUMENTS

Then run full monorepo verification:
```bash
npx turbo run typecheck --filter=@comp/api --filter=@comp/app
cd apps/app && npx vitest run
```

Output a Production Readiness Report summarizing all fixes applied and build status.
