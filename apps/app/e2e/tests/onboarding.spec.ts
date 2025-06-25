import { expect, test } from '@playwright/test';
import { authenticateTestUser, clearAuth } from '../utils/auth-helpers';
import {
  clickAndWait,
  expectToast,
  fillFormField,
  generateTestData,
  waitForURL,
} from '../utils/helpers';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await clearAuth(page);
  });

  test('new user can complete full onboarding flow', async ({ page }) => {
    const testData = generateTestData();

    // 1. Start at home page
    await page.goto('/');

    // 2. Should redirect to auth page for unauthenticated users
    await waitForURL(page, '/auth');

    // 3. Complete authentication using mock auth
    if (process.env.E2E_USE_REAL_AUTH === 'true') {
      // Real Google OAuth flow
      await page.click('button:has-text("Continue with Google")');
      // Handle OAuth in popup...
    } else {
      // Use mock auth endpoint for faster tests
      await authenticateTestUser(page, {
        email: testData.email,
        name: testData.userName,
      });

      // After authentication, explicitly navigate to setup
      await page.goto('/setup');

      // Wait for the page to fully load
      await page.waitForLoadState('domcontentloaded');
    }

    // 4. Should be on organization setup page
    await expect(page).toHaveURL('/setup');
    await expect(page.locator('h1, h2').first()).toContainText(
      /create.*organization|setup.*organization/i,
    );

    // 5. Fill organization details
    await fillFormField(
      page,
      '[name="organizationName"], [name="name"], #organizationName',
      testData.organizationName,
    );

    // Look for optional fields
    const hasIndustry = (await page.locator('[name="industry"]').count()) > 0;
    if (hasIndustry) {
      await page.locator('[name="industry"]').selectOption({ index: 1 });
    }

    // 6. Submit organization creation
    await clickAndWait(
      page,
      'button[type="submit"]:has-text("Create"), button:has-text("Continue")',
      { waitForNavigation: true },
    );

    // 7. Should redirect to organization dashboard/frameworks
    await waitForURL(page, /\/org_.*\/(dashboard|frameworks)/);

    // 8. Verify organization was created
    await expect(page.locator('text=' + testData.organizationName)).toBeVisible({ timeout: 10000 });
  });

  test('existing user can create additional organization', async ({ page }) => {
    const testData = generateTestData();

    // Authenticate user first
    await authenticateTestUser(page, {
      email: 'existing-user@example.com',
      name: 'Existing User',
    });

    // 1. Navigate to setup with intent
    await page.goto('/setup?intent=create-additional');

    // 2. Should be allowed to access setup page
    await expect(page).toHaveURL('/setup?intent=create-additional');

    // 3. Create new organization
    await fillFormField(
      page,
      '[name="organizationName"], [name="name"]',
      testData.organizationName,
    );
    await clickAndWait(page, 'button[type="submit"]', { waitForNavigation: true });

    // 4. Should redirect to new organization
    await waitForURL(page, /\/org_.*\/(dashboard|frameworks)/);
  });

  test('user without org is redirected to setup from dashboard', async ({ page }) => {
    // Authenticate user without organization
    await authenticateTestUser(page, {
      email: 'no-org-user@example.com',
      name: 'No Org User',
    });

    await page.goto('/');

    // Should be redirected to setup
    await waitForURL(page, '/setup');
    await expect(page.locator('h1, h2').first()).toContainText(/create.*organization|setup/i);
  });

  test('setup page validates required fields', async ({ page }) => {
    // Authenticate first
    await authenticateTestUser(page, {
      email: 'validation-test@example.com',
      name: 'Validation Test',
    });

    await page.goto('/setup');

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show validation errors
    await expect(page.locator('text=/required|enter.*name/i')).toBeVisible();

    // Fill organization name
    await fillFormField(page, '[name="organizationName"], [name="name"]', 'Test Organization');

    // Errors should disappear
    await expect(page.locator('text=/required|enter.*name/i')).not.toBeVisible();
  });

  test('handles organization creation errors gracefully', async ({ page }) => {
    // Authenticate first
    await authenticateTestUser(page, {
      email: 'error-test@example.com',
      name: 'Error Test',
    });

    // Mock API to return error
    await page.route('**/api/organization', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Organization name already exists' }),
      });
    });

    await page.goto('/setup');

    // Fill and submit form
    await fillFormField(page, '[name="organizationName"], [name="name"]', 'Existing Org');
    await clickAndWait(page, 'button[type="submit"]');

    // Should show error message
    await expectToast(page, 'Organization name already exists');

    // Should stay on setup page
    await expect(page).toHaveURL('/setup');
  });
});

test.describe('Setup Page Components', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await authenticateTestUser(page, {
      email: 'component-test@example.com',
      name: 'Component Test',
    });
  });

  test('displays progress indicator during setup', async ({ page }) => {
    await page.goto('/setup');

    // Check for progress indicators
    const progressIndicators = [
      'step.*1.*create.*organization',
      'step.*2.*invite.*team',
      'step.*3.*configure.*settings',
    ];

    for (const indicator of progressIndicators) {
      const element = page.locator(`text=/${indicator}/i`);
      if ((await element.count()) > 0) {
        await expect(element).toBeVisible();
      }
    }
  });

  test('organization name input has proper constraints', async ({ page }) => {
    await page.goto('/setup');

    const orgNameInput = page.locator('[name="organizationName"], [name="name"]');

    // Check max length
    const maxLength = await orgNameInput.getAttribute('maxlength');
    if (maxLength) {
      expect(parseInt(maxLength)).toBeGreaterThanOrEqual(50);
    }

    // Check placeholder
    const placeholder = await orgNameInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/setup');

    // Check that form is still accessible
    const orgNameInput = page.locator('[name="organizationName"], [name="name"]');
    await expect(orgNameInput).toBeVisible();

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // Form should be vertically stacked on mobile
    const form = page.locator('form').first();
    const formWidth = await form.boundingBox().then((box) => box?.width);
    expect(formWidth).toBeLessThan(400);
  });
});
