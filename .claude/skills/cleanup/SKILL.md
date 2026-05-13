---
name: cleanup
description: "MUST run after writing or modifying code — reviews changed files for verbose patterns, inconsistencies, and readability issues before considering work done"
---

# Post-Implementation Cleanup

**This skill is mandatory.** After writing or modifying code, you MUST review all changed files before reporting the task as complete. Code must be readable at a glance.

## When to Run

- After completing any implementation work
- After fixing bugs
- After refactoring
- Before committing

## Checklist

For every file you changed, verify:

### 1. No Verbose Defensive Checks

Extract repeated patterns into typed helpers.

```tsx
// ❌ Verbose and repeated
const perms = typeof role.permissions === 'string'
  ? JSON.parse(role.permissions) : role.permissions;
if (perms && typeof perms === 'object' && Array.isArray(perms.portal) && perms.portal.length > 0) {

// ✅ Typed helper
const perms = parseRolePermissions(role.permissions);
if (perms?.portal?.length) {
```

### 2. Consistent Idioms Across Files

The same check must use the same pattern everywhere.

```tsx
// ❌ Inconsistent
file1: perms?.portal?.length > 0
file2: perms?.portal?.length

// ✅ Pick one
perms?.portal?.length
```

### 3. No Redundant Type Casts

If you need a cast to satisfy TypeScript, extract a helper function instead.

```tsx
// ❌ Verbose cast repeated in every file
const restrictedRoles: readonly string[] = RESTRICTED_ROLES;
restrictedRoles.includes(role);

// ✅ Helper in shared package
export function isRestrictedRole(role: string): boolean {
  return (RESTRICTED_ROLES as readonly string[]).includes(role);
}
```

### 4. Error Handling on Boundaries

`JSON.parse`, external API calls, and DB queries at system boundaries need error handling.

```tsx
// ❌ Unguarded parse
const parsed = JSON.parse(value);

// ✅ Safe parse
try {
  return JSON.parse(value);
} catch {
  return null;
}
```

### 5. Shared Patterns Belong in Shared Packages

If the same logic appears in 2+ apps (api, app, portal), extract it to a shared package (`packages/auth`, `packages/db`, etc.).

### 6. No Dead Code

- Remove unused imports
- Remove unused variables
- Remove unused function parameters
- Remove props that are always null/false

### 7. Readable at a Glance

- Function and variable names should convey intent without reading the implementation
- One-liner expressions over multi-line when equally clear
- No nested ternaries

## How to Run

1. List all files you modified: `git diff --name-only`
2. Read each file and check against this checklist
3. Fix any issues found
4. Typecheck after fixes: `npx tsc --noEmit`
