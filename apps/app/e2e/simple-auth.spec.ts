import { expect, test } from '@playwright/test';

test('simple auth flow', async ({ page, context }) => {
  // Create a test user and authenticate
  const response = await context.request.post('http://localhost:3000/api/auth/test-login', {
    data: {
      email: `test-${Date.now()}@example.com`, // Use unique email to avoid conflicts
      name: 'Test User',
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.user).toBeDefined();
  expect(data.user.email).toContain('test-');

  // Verify session cookie was set
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === 'better-auth.session_token');
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.httpOnly).toBe(true);

  // Navigate to auth page - should be redirected since we're authenticated
  await page.goto('http://localhost:3000/auth');

  // Wait for redirect to complete
  await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 10000 });

  const currentUrl = page.url();

  // Verify we're redirected to an authenticated route
  expect(currentUrl).not.toContain('/auth');

  // Common authenticated routes include /setup, /dashboard, /upgrade, or organization-specific routes
  const isAuthenticatedRoute =
    currentUrl.includes('/setup') ||
    currentUrl.includes('/dashboard') ||
    currentUrl.includes('/upgrade') ||
    currentUrl.includes('/org_'); // Organization-specific routes

  expect(isAuthenticatedRoute).toBeTruthy();
});
