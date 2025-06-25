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

    // 1. Start by authenticating the user WITHOUT creating an organization
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true, // Don't create an org - user should go through setup
    });

    // 2. Navigate to root - this should trigger middleware redirects
    await page.goto('/');

    // 3. Wait for the redirect to complete - we expect to end up at /setup
    await page.waitForURL(/\/(setup\/[a-zA-Z0-9]+|auth)/, { timeout: 10000 });

    const currentUrl = page.url();
    console.log('After navigation, current URL:', currentUrl);

    // 4. If we're still on auth, try navigating again
    if (currentUrl.includes('/auth')) {
      await page.goto('/');
      await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });
    }

    // 5. Verify we're on the organization setup page
    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    // Give React time to render
    await page.waitForTimeout(3000);

    // Check what's visible
    const visibleText = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const texts = [];
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim();
        if (text && text.length > 2) {
          texts.push(text);
        }
      }
      return texts.join(' ');
    });

    console.log('Visible text on page:', visibleText.substring(0, 500));

    // Try to find framework cards or any framework-related content
    const hasFrameworkContent =
      visibleText.toLowerCase().includes('framework') ||
      visibleText.toLowerCase().includes('soc') ||
      visibleText.toLowerCase().includes('compliance');

    if (!hasFrameworkContent) {
      throw new Error(
        'Setup page does not seem to have loaded correctly. Visible text: ' +
          visibleText.substring(0, 200),
      );
    }

    // 6. Framework is already selected by default, verify Next button is enabled
    const nextButton = await page.waitForSelector('button:has-text("Next")', { timeout: 10000 });

    // Verify the button is enabled (not disabled)
    const isDisabled = await nextButton.isDisabled();
    expect(isDisabled).toBe(false);

    // Click Next to proceed
    await nextButton.click();

    // Wait for transition to organization name step
    await page.waitForTimeout(1000);

    // 7. Now we should be on organization name step
    // Wait for the organization name input to be visible
    await page.waitForSelector('input[name="organizationName"]', { timeout: 10000 });

    // Verify we're on the right step
    const stepText = await page.textContent('body');
    console.log('Step 2 visible text:', stepText?.includes('What is your company name'));

    // Verify Next button is disabled when field is empty
    const orgNameInput = page.locator('input[name="organizationName"]');
    await orgNameInput.clear(); // Make sure it's empty

    const submitButton = page.locator('button[type="submit"]:has-text("Next")');
    await expect(submitButton).toBeDisabled();

    // Fill organization name
    await fillFormField(page, 'input[name="organizationName"]', testData.organizationName);

    // Verify Next button is now enabled
    await expect(submitButton).toBeEnabled();

    // Look for optional fields
    const hasIndustry = (await page.locator('[name="industry"]').count()) > 0;
    if (hasIndustry) {
      await page.locator('[name="industry"]').selectOption({ index: 1 });
    }

    // 8. Submit organization creation
    // On step 2, we should click Next to continue
    await clickAndWait(page, 'button:has-text("Next")', { waitForNavigation: false });

    // Continue clicking Next through remaining steps until we're done
    // This is a multi-step form, so we need to complete all steps
    for (let i = 0; i < 10; i++) {
      // Check if we're still on a setup page
      const currentUrl = page.url();
      if (!currentUrl.includes('/setup/')) {
        break; // We've completed setup
      }

      // Check if there's a Next button
      const nextButton = await page.locator('button:has-text("Next")').count();
      if (nextButton > 0) {
        await page.locator('button:has-text("Next")').click();
        await page.waitForTimeout(1000);
      } else {
        // Look for a final submit button
        const submitButton = await page.locator('button[type="submit"]').count();
        if (submitButton > 0) {
          await page.locator('button[type="submit"]').click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // 9. Should redirect to organization dashboard/frameworks
    await waitForURL(page, /\/org_.*\/(dashboard|frameworks)/);

    // 10. Verify organization was created
    await expect(page.locator('text=' + testData.organizationName)).toBeVisible({ timeout: 10000 });
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

    // Create new organization
    await fillFormField(page, 'input[name="organizationName"]', testData.organizationName);
    await clickAndWait(page, 'button[type="submit"]', { waitForNavigation: true });

    // Should redirect to new organization
    await waitForURL(page, /\/org_.*\/(dashboard|frameworks)/);
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
    await page.route('**/api/**', (route) => {
      console.log('Intercepted API call:', route.request().url());
      if (
        route.request().url().includes('organization') ||
        route.request().url().includes('setup')
      ) {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Organization name already exists' }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/setup');

    // Wait for redirect to setup with session ID
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Framework is already selected, click Next
    await page.locator('button:has-text("Next")').click();

    // Wait for organization name step
    await page.waitForSelector('input[name="organizationName"]', { timeout: 10000 });

    // Fill and submit form
    await fillFormField(page, 'input[name="organizationName"]', 'Existing Org');
    await clickAndWait(page, 'button[type="submit"]');

    // Should show error message
    // Look for any error message, toast, or alert
    const errorElement = page.locator('text=/error|failed|already exists/i').first();
    await expect(errorElement).toBeVisible({ timeout: 10000 });

    // Should stay on setup page with session ID
    await expect(page).toHaveURL(/\/setup\/[a-zA-Z0-9]+/);
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

    // Find the selected framework checkbox and uncheck it
    const selectedCheckbox = await page.locator('input[type="checkbox"]:checked').first();
    await selectedCheckbox.click();

    // Next button should now be disabled
    await expect(nextButton).toBeDisabled();

    // Select a framework again
    const frameworkCard = page.locator('label[for^="framework-"]').first();
    await frameworkCard.click();

    // Next button should be enabled again
    await expect(nextButton).toBeEnabled();
  });
});
