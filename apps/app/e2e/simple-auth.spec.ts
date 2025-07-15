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

  // Navigate to root first to let the user settle into their authenticated state
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000); // Wait for all redirects to complete

  const afterRootUrl = page.url();
  console.log('URL after navigating to root:', afterRootUrl);

  // Now navigate to auth page - should be redirected since we're authenticated
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });

  // Wait for redirect away from auth
  await page.waitForURL((url) => !url.toString().includes('/auth'), { timeout: 5000 });

  // If we're on root, wait for the subsequent redirect to final destination
  if (new URL(page.url()).pathname === '/') {
    console.log('On root route, waiting for final redirect...');
    await page.waitForURL((url) => new URL(url).pathname !== '/', { timeout: 5000 });
  }

  const currentUrl = page.url();
  console.log('Final URL after auth redirect:', currentUrl);

  expect(currentUrl).not.toContain('/auth');

  // User should be on one of these meaningful authenticated routes
  const isAuthenticatedRoute =
    currentUrl.includes('/setup') || // Setup flow
    currentUrl.match(/\/org_[a-zA-Z0-9]+\//) !== null || // Organization pages
    currentUrl.includes('/upgrade') || // Upgrade page
    currentUrl.includes('/no-access') || // No access page
    currentUrl.includes('/onboarding'); // Onboarding flow

  expect(isAuthenticatedRoute).toBeTruthy();
});
