import { expect, test } from '@playwright/test';
import { authenticateTestUser } from './utils/auth-helpers';

test('debug: test authentication', async ({ page }) => {
  console.log('Starting authentication test...');

  // 1. Check test login endpoint is available
  const response = await page.context().request.post('/api/auth/test-login', {
    data: {
      email: 'debug-test@example.com',
      name: 'Debug Test User',
    },
  });

  console.log('Test login response status:', response.status());
  console.log('Test login response:', await response.json());

  expect(response.ok()).toBeTruthy();

  // 2. Check cookies are set
  const cookies = await page.context().cookies();
  console.log(
    'Cookies after auth:',
    cookies.map((c) => ({ name: c.name, value: c.value.substring(0, 10) + '...' })),
  );

  const sessionCookie = cookies.find((c) => c.name === 'better-auth.session_token');
  expect(sessionCookie).toBeDefined();

  // 3. Navigate and check if authenticated
  await page.goto('/');
  await page.waitForTimeout(1000);

  const currentUrl = page.url();
  console.log('Current URL after navigation:', currentUrl);

  // Should either be on setup (if no org) or dashboard (if has org)
  expect(currentUrl).toMatch(/\/(setup|auth|dashboard|frameworks)/);
});

test('debug: test authenticateTestUser helper', async ({ page }) => {
  // Test the helper function
  await authenticateTestUser(page, {
    email: 'helper-test@example.com',
    name: 'Helper Test User',
  });

  const currentUrl = page.url();
  console.log('URL after authenticateTestUser:', currentUrl);

  // Check cookies
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => c.name === 'better-auth.session_token');
  expect(sessionCookie).toBeDefined();
});
