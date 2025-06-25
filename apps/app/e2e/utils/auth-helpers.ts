import { type Page } from '@playwright/test';

interface AuthOptions {
  email?: string;
  name?: string;
  skipOrg?: boolean;
}

/**
 * Authenticate a test user by calling the test-login endpoint
 * This properly handles cookies in the browser context
 */
export async function authenticateTestUser(page: Page, options: AuthOptions = {}) {
  // Make the request through Playwright's request context to ensure cookies are set
  console.log('Attempting to authenticate test user:', options.email || 'auto-generated');

  const response = await page.context().request.post('/api/auth/test-login', {
    data: options,
    timeout: 30000, // Increase timeout to 30 seconds
  });

  if (!response.ok()) {
    const responseBody = await response.text().catch(() => 'Unable to read response body');
    console.error('Test login failed:', {
      status: response.status(),
      statusText: response.statusText(),
      body: responseBody,
    });
    throw new Error(`Test login failed: ${response.status()} ${response.statusText()}`);
  }

  const data = await response.json();

  // Give the browser time to process cookies
  await page.waitForTimeout(500);

  return data;
}

/**
 * Clear all authentication cookies
 */
export async function clearAuth(page: Page) {
  await page.context().clearCookies();
}
