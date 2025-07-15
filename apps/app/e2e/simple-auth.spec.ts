import { expect, test } from '@playwright/test';
import { authenticateTestUser } from './utils/auth-helpers';

test('simple auth flow', async ({ page, context, browserName }) => {
  const testEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}-${browserName}@example.com`;

  // Authenticate user
  await authenticateTestUser(page, {
    email: testEmail,
    name: 'Test User',
    skipOrg: false,
    hasAccess: true,
  });

  // Verify session cookie was set
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === 'better-auth.session_token');
  expect(sessionCookie).toBeDefined();

  // Navigate to root first
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Wait for final redirect to complete
  await page.waitForTimeout(3000); // Just wait for redirects to settle

  const afterRootUrl = page.url();
  console.log('URL after navigating to root:', afterRootUrl);

  // Now navigate to auth page - should be redirected since we're authenticated
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });

  // Wait for redirect away from auth
  await page.waitForURL((url) => !url.toString().includes('/auth'), { timeout: 5000 });

  const currentUrl = page.url();
  console.log('Current URL after auth redirect:', currentUrl);

  expect(currentUrl).not.toContain('/auth');

  console.log('Current URL after auth redirect:', currentUrl);

  // User should be on one of these authenticated routes
  const isAuthenticatedRoute =
    currentUrl.includes('/setup') || // Matches both /setup and /setup/
    currentUrl.match(/\/org_[a-zA-Z0-9]+\//) !== null || // Organization routes
    currentUrl.includes('/upgrade') ||
    currentUrl.includes('/no-access') ||
    currentUrl.includes('/onboarding');

  expect(isAuthenticatedRoute).toBeTruthy();
});
