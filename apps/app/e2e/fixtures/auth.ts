import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

// Define custom fixtures
type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  // This fixture provides an authenticated page
  authenticatedPage: async ({ browser }, use) => {
    // Check if we have saved auth state
    const authFile = path.join(__dirname, '../auth/user.json');
    let context: BrowserContext;

    try {
      await fs.access(authFile);
      // Use existing auth state
      context = await browser.newContext({ storageState: authFile });

      // Verify the auth state is still valid
      const page = await context.newPage();
      await page.goto('/');

      // If we get redirected to auth, the session is invalid
      if (page.url().includes('/auth')) {
        throw new Error('Saved auth state is invalid');
      }

      await page.close();
    } catch {
      // Need to authenticate
      context = await browser.newContext();
      const page = await context.newPage();

      // Go to login page and authenticate
      await page.goto('/auth');

      // For Google OAuth with better-auth
      // Option 1: Use test account with real Google OAuth (recommended for E2E)
      if (process.env.E2E_USE_REAL_AUTH === 'true') {
        // Click Google sign-in button
        await page.click(
          'button:has-text("Continue with Google"), button:has-text("Sign in with Google")',
        );

        // Handle Google OAuth flow in popup
        const popupPromise = page.waitForEvent('popup');
        const popup = await popupPromise;

        // Fill Google credentials
        await popup.fill('input[type="email"]', process.env.E2E_GOOGLE_EMAIL!);
        await popup.click('#identifierNext');

        await popup.waitForSelector('input[type="password"]', { state: 'visible' });
        await popup.fill('input[type="password"]', process.env.E2E_GOOGLE_PASSWORD!);
        await popup.click('#passwordNext');

        // Wait for OAuth callback
        await page.waitForURL('**/setup', { timeout: 30000 });
      } else {
        // Option 2: Mock auth for faster tests (requires test endpoint)
        // This assumes you have a test-only endpoint that creates a session
        await page.request.post('/api/auth/test-login', {
          data: {
            email: process.env.E2E_TEST_EMAIL || 'test@example.com',
            name: process.env.E2E_TEST_NAME || 'Test User',
          },
        });

        // Reload to get the session
        await page.reload();
      }

      // Save auth state for reuse
      await context.storageState({ path: authFile });
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
