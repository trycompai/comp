# E2E Testing with Playwright

This directory contains end-to-end tests for the application using Playwright.

## Environment Setup

### 1. Create Test Environment File

Create `.env.test.local` in the `apps/app` directory:

```env
# E2E Test Environment Variables

# Base URL for tests
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Enable test mode (required for mock auth)
E2E_TEST_MODE=true

# Mock Authentication (Recommended)
E2E_USE_REAL_AUTH=false
E2E_TEST_EMAIL=e2e-test@example.com
E2E_TEST_NAME=E2E Test User

# Database URL (use separate test database)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/comp_e2e_test

# Required app environment variables
AUTH_SECRET=test-secret-for-e2e-only
RESEND_API_KEY=re_test_key
NEXT_PUBLIC_PORTAL_URL=http://localhost:3002
REVALIDATION_SECRET=test-revalidation-secret

# Redis/Upstash test instance
UPSTASH_REDIS_REST_URL=https://test.upstash.io
UPSTASH_REDIS_REST_TOKEN=test-token

# Google OAuth credentials
GOOGLE_ID=test-client-id
GOOGLE_SECRET=test-client-secret
```

### 2. Set Up Test Database

```bash
# Create test database
createdb comp_e2e_test

# Run migrations on test database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/comp_e2e_test bun db:push
```

### 3. Authentication Options

#### Option A: Mock Authentication (Recommended)

- Fast and reliable for CI/CD
- Uses test endpoint to create sessions
- No external dependencies

#### Option B: Real Google OAuth

- More realistic but slower
- Requires test Google account
- Set `E2E_USE_REAL_AUTH=true` and provide credentials

## Quick Start

```bash
# Install Playwright browsers (one-time setup)
bun run test:e2e:install

# Run all E2E tests
bun run test:e2e

# Run tests in headed mode (see browser)
bun run test:e2e:headed

# Debug tests interactively
bun run test:e2e:debug

# Open Playwright UI
bun run test:e2e:ui

# View test report
bun run test:e2e:report
```

## Directory Structure

```
e2e/
├── tests/          # Test files
├── fixtures/       # Custom fixtures (auth, etc.)
├── utils/          # Helper functions
├── auth/           # Saved authentication state (gitignored)
└── screenshots/    # Test screenshots (gitignored)
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('My App');
  });
});
```

### Using Helper Functions

```typescript
import { fillFormField, clickAndWait, expectToast } from '../utils/helpers';

test('create organization', async ({ page }) => {
  await fillFormField(page, '[name="name"]', 'My Organization');
  await clickAndWait(page, 'button[type="submit"]');
  await expectToast(page, 'Organization created successfully');
});
```

### Using Authentication Fixture

```typescript
import { test, expect } from '../fixtures/auth';

test('authenticated user flow', async ({ authenticatedPage }) => {
  // authenticatedPage is already logged in
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage).toHaveURL('/dashboard');
});
```

## CI/CD Integration

Tests run automatically on:

- Pull requests
- Pushes to main branch
- Manual workflow dispatch

Three separate workflows:

1. **Quick Tests** - Fast smoke tests (< 5 min)
2. **Unit Tests** - All Vitest tests in parallel
3. **E2E Tests** - Full Playwright suite across browsers

## Environment Variables

Create `.env.test.local` for local testing:

```env
# Test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# Application URLs
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Database (for local testing)
DATABASE_URL=postgresql://user:pass@localhost:5432/test_db
```

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Generate unique test data** using timestamps
3. **Clean up after tests** to avoid conflicts
4. **Use Page Object Model** for complex pages
5. **Mock external APIs** when possible
6. **Take screenshots** on failures for debugging

## Debugging Failed Tests

1. **View trace**: Tests save traces on failure

   ```bash
   bunx playwright show-trace trace.zip
   ```

2. **Debug mode**: Step through tests interactively

   ```bash
   bun run test:e2e:debug
   ```

3. **UI mode**: Visual test runner

   ```bash
   bun run test:e2e:ui
   ```

4. **Check artifacts**: Screenshots and videos in CI artifacts

## Running Tests in CI

The E2E workflow:

1. Sets up PostgreSQL database
2. Runs migrations
3. Builds the application
4. Runs tests in parallel across browsers
5. Uploads results and artifacts

## Troubleshooting

### Tests timing out

- Increase timeout in test or globally in config
- Check for elements that never appear
- Ensure proper wait conditions

### Authentication issues

- Clear saved auth state: `rm -rf e2e/auth/`
- Check auth flow in fixtures/auth.ts
- Verify test user credentials

### Database issues

- Ensure migrations are up to date
- Check DATABASE_URL in environment
- Verify seed data if required

### Browser not installed

- Run `bun run test:e2e:install`
- Or install specific browser: `bunx playwright install chromium`

## 📊 Viewing Test Results

Test results can be viewed in multiple ways:

1. **GitHub Actions Summary** - Quick overview directly in the Actions tab
2. **GitHub Pages Dashboard** - Full HTML reports at https://trycompai.github.io/comp/
3. **Playwright Trace Viewer** - Debug failures at https://trace.playwright.dev

See [TEST_RESULTS_VIEWING.md](./TEST_RESULTS_VIEWING.md) for detailed instructions.

## 🔧 Debugging Tests

bunx playwright test --ui
