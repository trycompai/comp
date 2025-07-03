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
    await page.goto('/');

    // Should NOT be redirected to onboarding
    await page.waitForTimeout(2000); // Give time for any redirects
    expect(page.url()).not.toContain('/onboarding');

    // Should be on an authenticated page (org page, frameworks, etc)
    const isOnOrgPage =
      page.url().includes('/org_') ||
      page.url().includes('/frameworks') ||
      page.url().includes('/setup');
    expect(isOnOrgPage).toBeTruthy();
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
    await page.goto('/');

    // Should be redirected to setup
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });
    expect(page.url()).toContain('/setup/');
  });

  test('unauthenticated user is redirected to auth', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/org_123/frameworks');

    // Should be redirected to auth
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });
});
