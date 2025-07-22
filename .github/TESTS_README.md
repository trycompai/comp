# GitHub Actions Workflows

## Workflow Status

[![Quick Tests](https://github.com/trycompai/comp/actions/workflows/test-quick.yml/badge.svg)](https://github.com/trycompai/comp/actions/workflows/test-quick.yml)
[![Unit Tests](https://github.com/trycompai/comp/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/trycompai/comp/actions/workflows/unit-tests.yml)
[![E2E Tests](https://github.com/trycompai/comp/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/trycompai/comp/actions/workflows/e2e-tests.yml)
[![Release Tests](https://github.com/trycompai/comp/actions/workflows/release-tests.yml/badge.svg)](https://github.com/trycompai/comp/actions/workflows/release-tests.yml)

## Workflow Overview

### When Workflows Run

- **`pull_request:`** - Runs BEFORE merge (during PR review)
- **`push:`** - Runs AFTER merge (when code lands in branch)

| Workflow                                                              | Trigger          | When            | Purpose                  | Duration |
| --------------------------------------------------------------------- | ---------------- | --------------- | ------------------------ | -------- |
| [Quick Tests](workflows/test-quick.yml)                               | All PRs          | Before merge    | Fast smoke tests         | ~5 min   |
| [Unit Tests](workflows/unit-tests.yml)                                | All PRs          | Before merge    | Component & logic tests  | ~10 min  |
| [E2E Tests](workflows/e2e-tests.yml)                                  | All PRs          | Before merge    | Browser automation tests | ~20 min  |
| [Release Tests](workflows/release-tests.yml)                          | main→release PRs | Before merge    | Production readiness     | ~45 min  |
| [Database Migrations Dev](workflows/database-migrations-main.yml)     | Push to main     | **After merge** | Apply migrations to dev  | ~2 min   |
| [Database Migrations Prod](workflows/database-migrations-release.yml) | Push to release  | **After merge** | Apply migrations to prod | ~2 min   |
| [Release](workflows/release.yml)                                      | Push to release  | **After merge** | Semantic versioning      | ~5 min   |

## Quick Commands

### Run Tests Locally

```bash
# All tests (before pushing)
cd apps/app && bun run test:all

# Specific test types
bun run test              # Unit tests only
bun run test:e2e          # E2E tests only
bun run test:e2e:headed   # E2E with browser visible
```

### Debug Failed CI Tests

```bash
# View test results locally
bun run test:e2e:report

# Debug specific test
bun run test:e2e:debug

# Run specific test file
bunx vitest specific-test.spec.ts
bunx playwright test specific-e2e.spec.ts
```

## Branch Protection

- **main**: Requires Quick + Unit + E2E (Chromium)
- **release**: Requires all tests + production checks

See [BRANCH_PROTECTION.md](BRANCH_PROTECTION.md) for setup instructions.

## Workflow Files

- **Testing**
  - `test-quick.yml` - Type checking, linting, smoke tests
  - `unit-tests.yml` - Vitest tests for all apps
  - `e2e-tests.yml` - Playwright tests (multi-browser)
  - `release-tests.yml` - Production validation suite

- **Deployment**
  - `database-migrations-main.yml` - Auto-migrate dev database
  - `release.yml` - Semantic release & changelog

## Secrets Required

Add these to your repository settings → Secrets and variables → Actions:

### Required

- `DATABASE_URL_DEV` - Development database connection (for main branch)
- `DATABASE_URL_PROD` - Production database connection (for release branch)

### Optional

- `DISCORD_WEBHOOK` - Release notifications
- `GH_TOKEN` - GitHub PAT for semantic releases (if not using default GITHUB_TOKEN)

## Maintenance

- Workflows use `ubuntu-latest-custom` runner
- Update Playwright browsers monthly: `bunx playwright install`
- Check for action updates quarterly
- Review test performance weekly

## Troubleshooting

### Tests Pass Locally but Fail in CI

- Check environment variables
- Verify database migrations are up to date
- Look for timezone-dependent tests
- Check for hardcoded ports/URLs

### Slow Test Runs

- Review parallelization settings
- Check cache hit rates in logs
- Consider splitting large test files
- Use more specific path filters

### Flaky Tests

- Add proper wait conditions
- Avoid time-dependent assertions
- Mock external services
- Use data-testid attributes

## Contributing

When adding new workflows:

1. Follow existing naming patterns
2. Add path filters to avoid unnecessary runs
3. Use caching for dependencies
4. Set appropriate timeouts
5. Update this README
