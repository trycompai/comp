import { expect, test } from '@playwright/test';

test('simple auth flow', async ({ page, context, browserName }) => {
  // Create a test user and authenticate
  const testEmail = `test-${Date.now()}@example.com`;

  console.log(`[${browserName}] Starting test with email: ${testEmail}`);

  const response = await context.request.post('http://localhost:3000/api/auth/test-login', {
    data: {
      email: testEmail,
      name: 'Test User',
    },
    timeout: 30000, // 30 second timeout
  });

  // Add debugging for all browsers
  if (!response.ok()) {
    console.error(`[${browserName}] Test login failed:`, {
      status: response.status(),
      statusText: response.statusText(),
    });
    try {
      const body = await response.text();
      console.error(`[${browserName}] Response body:`, body);
    } catch (e) {
      console.error(`[${browserName}] Could not read response body`);
    }
  }

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
  await page.goto('http://localhost:3000/auth', { waitUntil: 'domcontentloaded' });

  // Wait for the redirect to happen
  // Since we know we should be redirected, wait for URL change
  let retries = 0;
  const maxRetries = 10;

  while (page.url().includes('/auth') && retries < maxRetries) {
    await page.waitForTimeout(500);
    retries++;
  }

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
