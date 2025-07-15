import { type Page } from '@playwright/test';

interface AuthOptions {
  email?: string;
  name?: string;
  skipOrg?: boolean;
  hasAccess?: boolean;
}

/**
 * Authenticate a test user by calling the test-login endpoint
 * This properly handles cookies in the browser context
 */
export async function authenticateTestUser(page: Page, options: AuthOptions = {}): Promise<void> {
  console.log('Attempting to authenticate test user:', options.email || 'auto-generated');

  let lastError: Error | null = null;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await page.context().request.post('/api/auth/test-login', {
        data: options,
        timeout: 30000, // Increase timeout to 30 seconds
      });

      if (!response.ok()) {
        const errorBody = await response.text();
        throw new Error(`Authentication failed: ${response.status()} - ${errorBody}`);
      }

      // Wait a bit for cookies to be set
      await page.waitForTimeout(1000);

      // Verify authentication by checking we're no longer on /auth
      const currentUrl = page.url();
      if (currentUrl.includes('/auth') && !currentUrl.includes('/api/auth')) {
        // We're still on auth page, wait a bit more
        await page.waitForTimeout(2000);
      }

      return; // Success, exit the function
    } catch (error: any) {
      lastError = error;
      console.error(`Authentication attempt ${attempt + 1} failed:`, error.message);

      // If it's a connection error and not the last attempt, retry
      if (
        (error.message.includes('ECONNRESET') || error.message.includes('ECONNREFUSED')) &&
        attempt < maxRetries - 1
      ) {
        console.log(`Retrying authentication in 2 seconds...`);
        await page.waitForTimeout(2000);
        continue;
      }

      // If it's the last attempt or a non-retryable error, throw
      throw error;
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('Authentication failed after all retries');
}

/**
 * Clear all authentication cookies
 */
export async function clearAuth(page: Page) {
  await page.context().clearCookies();
}

/**
 * Grant access to an organization for testing purposes
 * This calls the test-grant-access endpoint to update the hasAccess field
 */
export async function grantAccess(
  page: Page,
  orgId: string,
  hasAccess: boolean = true,
): Promise<void> {
  console.log(`Granting access to organization: ${orgId}, hasAccess: ${hasAccess}`);

  const response = await page.context().request.post('/api/auth/test-grant-access', {
    data: { orgId, hasAccess },
    timeout: 10000,
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Failed to grant access: ${response.status()} - ${errorBody}`);
  }

  const result = await response.json();
  console.log('Access granted successfully:', result);
}
