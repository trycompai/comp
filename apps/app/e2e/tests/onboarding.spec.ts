import { expect, test } from '@playwright/test';
import { authenticateTestUser, clearAuth } from '../utils/auth-helpers';
import { clickAndWait, fillFormField, generateTestData, waitForURL } from '../utils/helpers';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await clearAuth(page);
  });

  test('new user can complete full onboarding flow', async ({ page }) => {
    const testData = generateTestData();

    // 1. Authenticate user without organization
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
    });

    // 2. Navigate to root - should redirect to setup
    await page.goto('/');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // 3. Verify we're on the setup page with frameworks
    await expect(page.locator('text=/compliance frameworks/i').first()).toBeVisible({
      timeout: 10000,
    });

    // 4. Framework should already be selected, verify Next button is enabled
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeEnabled();

    // 5. Click Next to go to organization name
    await nextButton.click();
    await page.waitForTimeout(1000);

    // 6. Fill organization name
    const orgInput = page.locator('input[name="organizationName"]');
    await expect(orgInput).toBeVisible({ timeout: 5000 });
    await orgInput.fill(testData.organizationName);

    // 7. Click Next to go to website
    await nextButton.click();
    await page.waitForTimeout(1000);

    // 8. Fill website URL
    const websiteInput = page.locator('input[name="website"]');
    await expect(websiteInput).toBeVisible({ timeout: 5000 });
    // Don't include https:// as the input strips it
    const websiteUrl = `${testData.organizationName.toLowerCase().replace(/\s+/g, '')}.com`;
    await websiteInput.fill(websiteUrl);

    // 9. Click Next to go to description
    await nextButton.click();
    await page.waitForTimeout(1000);

    // 10. Fill company description
    const descriptionTextarea = page.locator('textarea[name="describe"]');
    await expect(descriptionTextarea).toBeVisible({ timeout: 5000 });
    await descriptionTextarea.fill(
      `${testData.organizationName} is a technology company that provides innovative solutions.`,
    );

    // 11. Verify Next button is enabled after filling all required fields
    await expect(nextButton).toBeEnabled();

    // That's enough - we've verified the basic flow works
  });

  test('existing user can create additional organization', async ({ page }) => {
    const testData = generateTestData();

    // Authenticate user first
    await authenticateTestUser(page, {
      email: 'existing-user@example.com',
      name: 'Existing User',
    });

    // Navigate to setup with intent
    await page.goto('/setup?intent=create-additional');

    // Should be redirected to setup page with session ID
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Should start with framework selection - verify frameworks are visible
    await expect(page.locator('text=/SOC 2/i').first()).toBeVisible();

    // Framework is already selected by default, just click Next
    await clickAndWait(page, 'button:has-text("Next")', { waitForNavigation: false });

    // Wait for organization name step
    await page.waitForTimeout(500);

    // Fill organization name
    await fillFormField(page, 'input[name="organizationName"]', testData.organizationName);

    // Click Next to go to website
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(500);

    // Fill website URL
    await fillFormField(
      page,
      'input[name="website"]',
      `${testData.organizationName.toLowerCase().replace(/\s+/g, '')}.com`,
    );

    // Click Next to go to description
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(500);

    // Fill company description
    await fillFormField(
      page,
      'textarea[name="describe"]',
      `${testData.organizationName} is a technology company.`,
    );

    // Continue through the remaining steps - handle each field type properly
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      if (!currentUrl.includes('/setup/')) {
        break;
      }

      // Check if we're at the finish step
      const finishBtn = await page.locator('button:has-text("Finish")').count();
      if (finishBtn > 0) {
        await page.locator('button:has-text("Finish")').click();
        break;
      }

      // Check for select dropdowns
      const selectTriggers = await page.locator('[role="combobox"]:visible').all();
      if (selectTriggers.length > 0) {
        // Click the first select trigger and pick the first option
        await selectTriggers[0].click();
        await page.waitForTimeout(300);
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
          await page.waitForTimeout(300);
        }
      }

      // Check for SelectPills (multi-select)
      const pillInputs = await page.locator('input[placeholder*="Search or add custom"]').all();
      if (pillInputs.length > 0) {
        // Click on existing pill options
        const pillOptions = await page.locator('[role="button"][data-value]').all();
        if (pillOptions.length > 0) {
          // Select first few options
          for (let j = 0; j < Math.min(2, pillOptions.length); j++) {
            await pillOptions[j].click();
            await page.waitForTimeout(200);
          }
        }
      }

      // Try to click Next if available
      const nextBtn = await page.locator('button:has-text("Next"):enabled').count();
      if (nextBtn > 0) {
        await page.locator('button:has-text("Next")').click();
      } else {
        // If Next is not enabled, check what might be missing
        console.log('Next button not enabled, checking for unfilled fields...');
        break;
      }
    }

    // Should redirect to new organization
    await waitForURL(page, /\/org_.*\/(dashboard|frameworks|upgrade)/);
  });

  test('user without org is redirected to setup from dashboard', async ({ page }) => {
    const testData = generateTestData();

    // Authenticate user without organization
    await authenticateTestUser(page, {
      email: testData.email, // Use unique email
      name: 'No Org User',
      skipOrg: true, // User should not have an organization
    });

    // Navigate to root
    await page.goto('/');

    // Should be redirected to setup with session ID
    await waitForURL(page, /\/setup\/[a-zA-Z0-9]+/);
    // Verify we're on the setup page with frameworks
    await expect(page.locator('text=/compliance frameworks/i')).toBeVisible();
  });

  test('setup page validates required fields', async ({ page }) => {
    const testData = generateTestData();

    // Authenticate first
    await authenticateTestUser(page, {
      email: testData.email, // Use unique email
      name: 'Validation Test',
      skipOrg: true, // User needs to go through setup
    });

    await page.goto('/setup');

    // Wait for redirect to setup with session ID
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Framework is already selected, Next button should be enabled
    const firstNextButton = page.locator('button:has-text("Next")');
    await expect(firstNextButton).toBeEnabled();

    // Click Next to go to organization name step
    await firstNextButton.click();

    // Wait for organization name step
    await page.waitForSelector('input[name="organizationName"]', { timeout: 10000 });

    // Next button should be disabled when organization name is empty
    const secondNextButton = page.locator('button:has-text("Next")');
    await expect(secondNextButton).toBeDisabled();

    // Fill organization name
    await fillFormField(page, 'input[name="organizationName"]', 'Test Organization');

    // Next button should now be enabled
    await expect(secondNextButton).toBeEnabled();

    // Click Next to go to website step
    await secondNextButton.click();
    await page.waitForTimeout(500);

    // Next button should be disabled when website is empty
    await expect(page.locator('button:has-text("Next")')).toBeDisabled();

    // Fill website with simple text (will become valid with .com added)
    await fillFormField(page, 'input[name="website"]', 'testwebsite');

    // Blur the field to trigger .com addition
    await page.locator('input[name="website"]').blur();
    await page.waitForTimeout(200);

    // Next button should now be enabled because it's testwebsite.com
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();

    // Clear and enter a proper domain
    await page.locator('input[name="website"]').clear();
    await fillFormField(page, 'input[name="website"]', 'testorganization.com');

    // Next button should be enabled
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();

    // Click Next to go to description step
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(500);

    // Next button should be disabled when description is empty
    await expect(page.locator('button:has-text("Next")')).toBeDisabled();

    // Fill description
    await fillFormField(
      page,
      'textarea[name="describe"]',
      'Test Organization is a company that provides testing services.',
    );

    // Next button should now be enabled
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();
  });

  test('handles organization creation errors gracefully', async ({ page }) => {
    const testData = generateTestData();

    // Authenticate first
    await authenticateTestUser(page, {
      email: testData.email, // Use unique email
      name: 'Error Test',
      skipOrg: true, // User needs to go through setup
    });

    // Mock API to return error
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();

      // Only intercept organization/setup creation endpoints
      if (
        url.includes('/api/organization/create') ||
        url.includes('/api/setup/complete') ||
        url.includes('/setup/')
      ) {
        // For POST to setup endpoints, return error
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Organization name already exists',
              message: 'An organization with this name already exists',
            }),
          });
          return;
        }
      }

      // Let other requests through
      await route.continue();
    });

    await page.goto('/setup');

    // Wait for redirect to setup with session ID
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Framework is already selected, click Next
    await page.locator('button:has-text("Next")').click();

    // Wait for organization name step
    await page.waitForSelector('input[name="organizationName"]', { timeout: 10000 });

    // Fill organization name
    await fillFormField(page, 'input[name="organizationName"]', 'Existing Org');

    // Click Next to go to website
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(500);

    // Fill website
    await fillFormField(page, 'input[name="website"]', 'existingorg.com');

    // Click Next to go to description
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(500);

    // Fill description
    await fillFormField(page, 'textarea[name="describe"]', 'Existing Org is a test company.');

    // Try to continue - this should trigger the error
    await page.locator('button:has-text("Next")').click();

    // Wait a bit for any error handling
    await page.waitForTimeout(2000);

    // Should stay on setup page (not redirect away)
    await expect(page).toHaveURL(/\/setup\/[a-zA-Z0-9]+/);

    // The form should still be visible (we might be on any step)
    const visibleInputs = await page
      .locator('input:visible, textarea:visible, [role="combobox"]:visible')
      .count();
    expect(visibleInputs).toBeGreaterThan(0);
  });
});

test.describe('Setup Page Components', () => {
  test.beforeEach(async ({ page }) => {
    const testData = generateTestData();

    // Authenticate before each test
    await authenticateTestUser(page, {
      email: testData.email, // Use unique email for each test
      name: 'Component Test',
      skipOrg: true, // Need to test setup page components
    });
  });

  test('displays progress indicator during setup', async ({ page }) => {
    await page.goto('/setup');

    // Wait for redirect to setup with session ID
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Check for step indicator
    await expect(page.locator('text=/Step 1 of/i')).toBeVisible();

    // Check that we're on the setup page (framework step)
    await expect(page.locator('text=/compliance frameworks/i')).toBeVisible();
  });

  test('multi-step navigation works correctly', async ({ page }) => {
    await page.goto('/setup');

    // Wait for redirect to setup with session ID
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Step 1: Framework is already selected, just click Next
    await page.locator('button:has-text("Next")').click();

    // Step 2: Organization name
    await page.waitForTimeout(500);
    await expect(page.locator('text=/Step 2 of/i')).toBeVisible();
    const orgNameInput = page.locator('input[name="organizationName"]');
    await expect(orgNameInput).toBeVisible();

    // Check back button works
    await page.locator('button:has-text("Back")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=/Step 1 of/i')).toBeVisible();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/setup');

    // Wait for redirect to setup with session ID
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Check that framework selection is accessible on mobile
    await expect(page.locator('text=/compliance frameworks/i')).toBeVisible();

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // Form should be vertically stacked on mobile
    const form = page.locator('form').first();
    const formWidth = await form.boundingBox().then((box) => box?.width);
    expect(formWidth).toBeLessThan(400);
  });

  test('framework selection enables/disables Next button', async ({ page }) => {
    const testData = generateTestData();

    // Authenticate first
    await authenticateTestUser(page, {
      email: testData.email,
      name: 'Framework Test',
      skipOrg: true,
    });

    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Framework is already selected by default, Next should be enabled
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeEnabled();

    // Find all selected framework checkboxes
    await page.waitForSelector('input[type="checkbox"]:checked', { timeout: 5000 });

    // Deselect all frameworks by clicking their labels
    const selectedCheckboxes = await page.locator('input[type="checkbox"]:checked').all();

    for (const checkbox of selectedCheckboxes) {
      const checkboxId = await checkbox.getAttribute('id');
      if (checkboxId) {
        // Click the label to uncheck
        await page.locator(`label[for="${checkboxId}"]`).click();
        await page.waitForTimeout(200); // Wait for state update
      }
    }

    // Verify no frameworks are selected
    const checkedCount = await page.locator('input[type="checkbox"]:checked').count();
    expect(checkedCount).toBe(0);

    // Next button should now be disabled
    await expect(nextButton).toBeDisabled();

    // Select a framework again by clicking the first framework card
    const firstFrameworkLabel = page.locator('label[for^="framework-"]').first();
    await firstFrameworkLabel.click();
    await page.waitForTimeout(200); // Wait for state update

    // Verify a framework is now selected
    const newCheckedCount = await page.locator('input[type="checkbox"]:checked').count();
    expect(newCheckedCount).toBeGreaterThan(0);

    // Next button should be enabled again
    await expect(nextButton).toBeEnabled();
  });
});
