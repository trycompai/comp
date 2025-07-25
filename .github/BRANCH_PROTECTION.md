# Branch Protection Setup

To ensure code quality and prevent broken builds, configure branch protection rules for your `main` and `release` branches.

## Branching Strategy

- **Feature branches** → `main` (development)
- **main** → `release` (production)

## Branch Protection Rules

### For `main` Branch

Go to **Settings → Branches** in your GitHub repository and add a branch protection rule for `main` with these required status checks:

### Must Pass Before Merging:

1. **Quick Checks** (Quick Tests)
   - Fast smoke tests that run on every PR
   - Includes type checking, linting, and critical middleware tests
   - Should complete in < 5 minutes

2. **Unit Tests** (Unit Tests / app)
   - Vitest unit tests for the main app
   - Tests business logic, utilities, and components

3. **E2E Tests** (at least one of):
   - E2E Tests - chromium (recommended minimum)
   - E2E Tests - firefox (optional)
   - E2E Tests - webkit (optional)

## Recommended Settings

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
- [x] **Require conversation resolution before merging**
- [x] **Require linear history** (optional, for cleaner git history)
- [x] **Include administrators** (enforce rules for everyone)
- [ ] **Allow force pushes** (keep disabled)

### For `release` Branch

For the `release` branch, use stricter rules since this deploys to production:

#### Must Pass Before Merging:

1. **All checks from main** (automatically included)
2. **Release Readiness Checks** - Production build, bundle size, security audit
3. **Comprehensive E2E - All Browsers** - Full browser matrix testing
4. **Database Migration Safety** - Checks for breaking changes

## Setting Up Protection Rules

### Main Branch Protection

1. Go to your repository settings
2. Click on "Branches" in the sidebar
3. Click "Add rule" for `main`
4. Configure as follows:

```
Branch name pattern: main

Protect matching branches:
✓ Require a pull request before merging
  ✓ Require approvals: 1
  ✓ Dismiss stale pull request approvals when new commits are pushed

✓ Require status checks to pass before merging
  ✓ Require branches to be up to date before merging

  Status checks that are required:
  - Quick Checks
  - Unit Tests (app)
  - E2E Tests - chromium

✓ Require conversation resolution before merging
✓ Require linear history
✓ Include administrators
✗ Allow force pushes
✗ Allow deletions
```

### Release Branch Protection

1. Add another rule for `release`
2. Configure with stricter settings:

```
Branch name pattern: release

Protect matching branches:
✓ Require a pull request before merging
  ✓ Require approvals: 2  # More approvals for production
  ✓ Dismiss stale pull request approvals when new commits are pushed
  ✓ Restrict who can dismiss pull request reviews

✓ Require status checks to pass before merging
  ✓ Require branches to be up to date before merging

  Status checks that are required:
  - Quick Checks
  - Unit Tests (app)
  - Unit Tests (portal)
  - E2E Tests - chromium
  - E2E Tests - firefox
  - E2E Tests - webkit
  - Release Readiness Checks
  - Comprehensive E2E - All Browsers
  - Database Migration Safety

✓ Require conversation resolution before merging
✓ Require linear history
✓ Include administrators
✓ Restrict who can push to matching branches
  - Only allow specific users/teams
✗ Allow force pushes
✗ Allow deletions
```

## Workflow Dependencies

The protection rules depend on these GitHub Actions workflows:

- `.github/workflows/test-quick.yml` - Quick smoke tests (all PRs)
- `.github/workflows/unit-tests.yml` - Comprehensive unit tests (all PRs)
- `.github/workflows/e2e-tests.yml` - End-to-end browser tests (all PRs)
- `.github/workflows/release-tests.yml` - Additional production checks (main→release only)

## Bypassing Protection (Emergency Only)

If you need to bypass protection in an emergency:

1. Repository admins can temporarily disable "Include administrators"
2. Make the necessary changes
3. **Immediately re-enable the protection**

## Monitoring Test Health

- Check Actions tab regularly for flaky tests
- Address failing tests immediately
- Use workflow run history to identify patterns
- Set up notifications for workflow failures

## Best Practices

1. **Never disable tests** to merge - fix them instead
2. **Keep tests fast** - parallelize when possible
3. **Fix flaky tests** immediately when discovered
4. **Update protection rules** as new test suites are added
5. **Document exemptions** if any test is temporarily disabled
