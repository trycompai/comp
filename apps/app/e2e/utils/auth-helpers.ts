import { type Page } from '@playwright/test';

/**
 * Authenticate a test user by calling the test-login endpoint
 * This properly handles cookies in the browser context
 */
export async function authenticateTestUser(
  page: Page,
  options: {
    email: string;
    name?: string;
  },
) {
  // Make the request through Playwright's request context to ensure cookies are set
  const response = await page.context().request.post('/api/auth/test-login', {
    data: options,
  });

  if (!response.ok()) {
    throw new Error(`Authentication failed: ${response.statusText()}`);
  }

  // Navigate to a page to ensure cookies are applied
  await page.goto('/');

  // Give the browser a moment to process the cookies and any redirects
  await page.waitForTimeout(500);
}

/**
 * Clear all authentication cookies
 */
export async function clearAuth(page: Page) {
  await page.context().clearCookies();
}
