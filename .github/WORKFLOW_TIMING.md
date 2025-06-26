# Workflow Timing Explained

## PR Workflows vs Post-Merge Workflows

### Visual Flow

```
Feature Branch              Main Branch            Release Branch
     |                           |                        |
     |------ PR #123 ------>     |                        |
     |         ↓                 |                        |
     |    [Tests Run]            |                        |
     |    ✅ Quick Tests         |                        |
     |    ✅ Unit Tests          |                        |
     |    ✅ E2E Tests           |                        |
     |         ↓                 |                        |
     |    [PR Approved]          |                        |
     |         ↓                 |                        |
     |    [Merge Button]         |                        |
     |         ↓                 |                        |
     └---------→ ● <-- Merged    |                        |
                 |               |                        |
                 ↓               |                        |
            [After Merge]        |                        |
            [DB Migration]       |                        |
                 |               |                        |
                 |               |                        |
                 |------ PR #124 ------>|                 |
                 |         ↓            |                 |
                 |    [Tests Run]       |                 |
                 |    ✅ All Tests      |                 |
                 |    ✅ Release Tests  |                 |
                 |         ↓            |                 |
                 |    [PR Approved]     |                 |
                 |         ↓            |                 |
                 └---------→ ● <-- Merged                 |
                             |                            |
                             ↓                            |
                        [After Merge]                     |
                        [DB Migration]                    |
                        [Semantic Release]                |
```

## Key Differences

### PR Workflows (`pull_request:`)

**When:** Before code is merged  
**Purpose:** Validate changes are safe to merge  
**Can block merge:** Yes

```yaml
on:
  pull_request:
    branches: [main, release]
```

**Examples:**

- Unit Tests
- E2E Tests
- Linting
- Type Checking
- Security Scans

### Post-Merge Workflows (`push:`)

**When:** After code is merged  
**Purpose:** Deploy or update systems  
**Can block merge:** No (already merged!)

```yaml
on:
  push:
    branches: [main, release]
```

**Examples:**

- Database Migrations
- Deployments
- Tag Creation
- Notifications
- Documentation Updates

## Why This Matters

### Database Migrations MUST Run After Merge

```yaml
# ✅ CORRECT - Runs after merge
on:
  push:
    branches: [release]

# ❌ WRONG - Would run during PR review
on:
  pull_request:
    branches: [release]
```

**Why?**

- You don't want to migrate production DB during PR review
- Multiple PRs could conflict if they both try to migrate
- Migrations should only happen once code is approved and merged

### Tests MUST Run Before Merge

```yaml
# ✅ CORRECT - Runs during PR review
on:
  pull_request:
    branches: [main, release]

# ❌ WRONG - Too late, code already merged!
on:
  push:
    branches: [main, release]
```

**Why?**

- Catch bugs before they reach main/release
- Block bad code from being merged
- Give reviewers confidence

## Common Patterns

### 1. Development Workflow (feature → main)

```yaml
# Tests (BEFORE merge)
on:
  pull_request:
    branches: [main]

# Dev deployment (AFTER merge)
on:
  push:
    branches: [main]
```

### 2. Production Workflow (main → release)

```yaml
# Extra validation (BEFORE merge)
on:
  pull_request:
    branches: [release]

# Production deployment (AFTER merge)
on:
  push:
    branches: [release]
```

### 3. Both Together

```yaml
# Runs on all PRs to main OR release
on:
  pull_request:
    branches: [main, release]
  # Also runs after merge (different job logic)
  push:
    branches: [main, release]
```

## Quick Reference

| If you want to...       | Use trigger     | Example                |
| ----------------------- | --------------- | ---------------------- |
| Block bad code          | `pull_request:` | Tests, linting         |
| Validate before merge   | `pull_request:` | Security scans         |
| Deploy after merge      | `push:`         | Deploy to staging/prod |
| Run migrations          | `push:`         | Database updates       |
| Create releases/tags    | `push:`         | Semantic release       |
| Update external systems | `push:`         | Notify Slack, JIRA     |
| Clean up after merge    | `push:`         | Delete preview envs    |

## Testing Your Workflow Timing

1. **Check the trigger:**

   ```yaml
   on:
     pull_request: # Before merge
     push: # After merge
   ```

2. **Test locally:**

   ```bash
   # Simulate PR workflow
   act pull_request

   # Simulate push workflow
   act push
   ```

3. **Look at GitHub UI:**
   - PR workflows show in "Checks" tab of PR
   - Push workflows show in "Actions" tab of repo
