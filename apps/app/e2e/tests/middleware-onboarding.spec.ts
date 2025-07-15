import { expect, test } from '@playwright/test';
import { authenticateTestUser, clearAuth } from '../utils/auth-helpers';
import { generateTestData } from '../utils/helpers';

test.describe('Middleware Onboarding Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('user with null onboardingCompleted is NOT redirected to onboarding', async ({ page }) => {
    const testData = generateTestData();

    // Create user with org (onboardingCompleted will be null by default)
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: false, // Creates org with null onboardingCompleted
    });

    // Try to access organization page
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for all redirects to complete
    await page.waitForTimeout(3000); // Just wait for redirects to settle

    const currentUrl = page.url();
    console.log('Current URL after navigation:', currentUrl);

    expect(currentUrl).not.toContain('/onboarding');

    // Should be on an authenticated page - could be org page or setup (if activeOrgId not set)
    const isOnValidPage =
      currentUrl.match(/\/org_[a-zA-Z0-9]+\//) !== null || // Organization routes
      currentUrl.match(/\/setup\/[a-zA-Z0-9]+/) !== null || // Dynamic setup URLs
      currentUrl.includes('/upgrade'); // Upgrade page

    expect(isOnValidPage).toBeTruthy();
  });

  test('user without org is redirected to setup', async ({ page }) => {
    const testData = generateTestData();

    // Create user without org
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
    });

    // Navigate to root
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for redirects
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('User without org redirected to:', currentUrl);

    // Should be redirected to setup (with dynamic ID)
    expect(currentUrl).toMatch(/\/setup\/[a-zA-Z0-9]+/);
  });

  test('unauthenticated user is redirected to auth', async ({ page }) => {
    // Try to access protected route without auth, expecting redirect
    const response = await page.goto('/org_123/frameworks', {
      waitUntil: 'commit', // Just wait for navigation to start, not complete
    });

    // Wait a bit for redirect
    await page.waitForTimeout(1000);

    // Check final URL
    const currentUrl = page.url();
    console.log('Unauthenticated user redirected to:', currentUrl);

    // Should be redirected to auth
    expect(currentUrl).toContain('/auth');
  });
});
