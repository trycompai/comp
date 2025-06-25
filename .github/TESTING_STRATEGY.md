# Testing Strategy

## Overview

Our testing strategy is designed to provide fast feedback for development while ensuring thorough validation before production deployments.

## PR Types and Test Coverage

### Feature Branch → Main PRs

**Purpose**: Regular development work
**Test Coverage**: Standard

| Test Type    | Browsers      | Timeout | Required |
| ------------ | ------------- | ------- | -------- |
| Quick Checks | N/A           | 5 min   | ✅ Yes   |
| Unit Tests   | N/A           | 10 min  | ✅ Yes   |
| E2E Tests    | Chromium only | 20 min  | ✅ Yes   |

**Total Time**: ~15 minutes (parallelized)

### Main → Release PRs

**Purpose**: Production deployment
**Test Coverage**: Comprehensive

| Test Type             | Browsers                  | Timeout | Required |
| --------------------- | ------------------------- | ------- | -------- |
| Quick Checks          | N/A                       | 5 min   | ✅ Yes   |
| Unit Tests (all apps) | N/A                       | 10 min  | ✅ Yes   |
| E2E Tests             | Chromium, Firefox, WebKit | 20 min  | ✅ Yes   |
| Release Readiness     | N/A                       | 30 min  | ✅ Yes   |
| Comprehensive E2E     | All browsers              | 45 min  | ✅ Yes   |
| Migration Safety      | N/A                       | 5 min   | ✅ Yes   |

**Total Time**: ~30-45 minutes (parallelized)

## Test Descriptions

### Quick Checks

- Type checking
- Linting
- Critical middleware tests
- Basic build verification

### Unit Tests

- Component tests
- Business logic tests
- Utility function tests
- Hooks and store tests

### E2E Tests (Standard)

- Critical user journeys
- Onboarding flow
- Authentication
- Basic CRUD operations

### Release-Specific Tests

#### Release Readiness Checks

- Production build verification
- Bundle size analysis
- Strict TypeScript checking
- Security vulnerability scanning
- License compliance

#### Comprehensive E2E

- All test suites
- All supported browsers
- Extended test scenarios
- Performance benchmarks

#### Migration Safety

- Schema change detection
- Breaking change analysis
- Migration compatibility check
- Rollback plan verification

## Performance Optimization

### Parallelization Strategy

```
Feature → Main:
├── Quick Checks
├── Unit Tests (per app)
└── E2E (Chromium)

Main → Release:
├── Quick Checks
├── Unit Tests (all apps in parallel)
├── E2E Tests (3 browsers in parallel)
├── Release Readiness
├── Comprehensive E2E (all browsers)
└── Migration Safety
```

### Caching

- Dependencies (Bun cache)
- Playwright browsers
- Build artifacts
- Test results

### Smart Triggers

- Only run when relevant files change
- Skip tests for documentation-only changes
- Use path filters to avoid unnecessary runs

## Local Testing

Before pushing:

```bash
# For feature work
bun run test:all  # Runs unit + E2E (Chromium)

# Before release PR
bun run test       # All unit tests
bun run test:e2e   # All E2E tests
```

## Monitoring and Maintenance

### Weekly Tasks

- Review test execution times
- Check for flaky tests
- Update browser versions
- Review test coverage

### Monthly Tasks

- Audit test suite for redundancy
- Update security scanning rules
- Review and optimize slow tests
- Update documentation

## Emergency Procedures

### Flaky Test

1. Mark test as `.skip` temporarily
2. Create issue to fix
3. Fix within 48 hours
4. Re-enable test

### CI System Down

1. Run tests locally
2. Get manual approval from team lead
3. Document in PR description
4. Re-run when CI is restored

### Urgent Hotfix

1. Create PR directly to release
2. Run minimal test suite locally
3. Get approval from 2 reviewers
4. Deploy with manual verification
5. Backport to main immediately
