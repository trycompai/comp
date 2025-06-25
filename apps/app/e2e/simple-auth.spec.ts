import { expect, test } from '@playwright/test';

test('simple auth flow', async ({ page, context }) => {
  // Create a test user and authenticate
  const testEmail = `test-${Date.now()}@example.com`;

  const response = await context.request.post('http://localhost:3000/api/auth/test-login', {
    data: {
      email: testEmail,
      name: 'Test User',
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.user).toBeDefined();
  expect(data.user.email).toBe(testEmail);
  expect(data.user.emailVerified).toBe(true);

  // Verify session cookie was set
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === 'better-auth.session_token');
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.httpOnly).toBe(true);

  // Navigate to auth page - should be redirected since we're authenticated
  await page.goto('http://localhost:3000/auth');

  // Wait for redirect to complete - wait for any URL that's not the auth page
  await page.waitForURL('**/!(auth)', { timeout: 10000 });

  const currentUrl = page.url();

  // Verify we're redirected to an authenticated route
  expect(currentUrl).not.toContain('/auth');

  // Common authenticated routes include /setup, /dashboard, /upgrade, or organization-specific routes
  const isAuthenticatedRoute =
    currentUrl.includes('/setup') ||
    currentUrl.includes('/dashboard') ||
    currentUrl.includes('/upgrade') ||
    currentUrl.includes('/org_');

  expect(isAuthenticatedRoute).toBeTruthy();
});
