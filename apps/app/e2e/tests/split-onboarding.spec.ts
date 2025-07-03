import { expect, test } from '@playwright/test';
import { authenticateTestUser, clearAuth } from '../utils/auth-helpers';
import { generateTestData } from '../utils/helpers';

test.describe('Split Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await clearAuth(page);
  });

  test('new user completes split onboarding: 3 steps → payment → 9 steps → product access', async ({
    page,
  }) => {
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user first
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true, // Don't create org, user will go through setup
    });

    // Navigate to setup
    await page.goto('/setup');

    // Should redirect to /setup/[setupId]
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Wait for content to load
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Step 1: Select framework
    await expect(page.locator('text=/compliance frameworks/i').first()).toBeVisible({
      timeout: 10000,
    });

    // Check if framework is already selected, if not select one
    const checkedFrameworks = await page.locator('input[type="checkbox"]:checked').count();
    if (checkedFrameworks === 0) {
      await page.locator('label:has-text("SOC 2")').click();
    }
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Organization name
    await page.waitForSelector('input[name="organizationName"]', { timeout: 10000 });
    await page.locator('input[name="organizationName"]').fill(testData.organizationName);
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: Website
    await page.waitForSelector('input[name="website"]', { timeout: 10000 });
    await page.locator('input[name="website"]').fill(website);
    await page.getByRole('button', { name: 'Next' }).click();

    // Should redirect to upgrade page
    await expect(page).toHaveURL(/\/upgrade\/org_/);

    // Mock successful payment by navigating to Stripe success URL
    const orgIdMatch = page.url().match(/org_[a-zA-Z0-9]+/);
    expect(orgIdMatch).toBeTruthy();
    const orgId = orgIdMatch![0];

    // Simulate Stripe success redirect
    await page.goto(`/api/stripe/success?organizationId=${orgId}&planType=starter`);

    // Should redirect to onboarding
    await expect(page).toHaveURL(`/onboarding/${orgId}`);

    // Should see step 4 (describe)
    await expect(page.getByText('Step 4 of 12')).toBeVisible();
    await expect(page.getByText('Tell us a bit about your business')).toBeVisible();

    // Complete remaining steps quickly
    const remainingSteps = [
      { field: 'textarea', value: 'We are a test company' },
      { field: 'select', text: 'Technology' },
      { field: 'select', text: '11-50' },
      { field: 'multiselect', values: ['Company-provided laptops'] },
      { field: 'multiselect', values: ['Single sign-on (SSO)'] },
      { field: 'multiselect', values: ['GitHub'] },
      { field: 'multiselect', values: ['Remote'] },
      { field: 'multiselect', values: ['Cloud (AWS, GCP, Azure)'] },
      { field: 'multiselect', values: ['Customer data'] },
    ];

    for (const step of remainingSteps) {
      if (step.field === 'textarea' && step.value) {
        await page.locator('textarea').fill(step.value);
      } else if (step.field === 'select' && step.text) {
        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: step.text }).click();
      } else if (step.field === 'multiselect' && step.values) {
        for (const value of step.values) {
          await page.getByPlaceholder(/Type to search/).click();
          await page.getByRole('option', { name: value }).click();
        }
      }
      await page.getByRole('button', { name: 'Next' }).click();
    }

    // Final step should say "Complete Setup"
    await expect(page.getByRole('button', { name: 'Complete Setup' })).toBeVisible();
    await page.getByRole('button', { name: 'Complete Setup' }).click();

    // Should redirect to product
    await expect(page).toHaveURL(`/${orgId}/frameworks`);

    // Verify can access product pages
    await page.goto(`/${orgId}/policies`);
    await expect(page).toHaveURL(`/${orgId}/policies`);
  });

  test('paid user without completed onboarding is redirected to /onboarding', async ({
    page,
    context,
  }) => {
    // Create a user with subscription but incomplete onboarding
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user first
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
    });

    // First create org through minimal flow
    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Select framework
    const checkedFrameworks = await page.locator('input[type="checkbox"]:checked').count();
    if (checkedFrameworks === 0) {
      await page.locator('label:has-text("SOC 2")').click();
    }
    await page.getByRole('button', { name: 'Next' }).click();

    // Fill organization name
    await page.waitForSelector('input[name="organizationName"]', { timeout: 10000 });
    await page.locator('input[name="organizationName"]').fill(testData.organizationName);
    await page.getByRole('button', { name: 'Next' }).click();

    // Fill website
    await page.waitForSelector('input[name="website"]', { timeout: 10000 });
    await page.locator('input[name="website"]').fill(website);
    await page.getByRole('button', { name: 'Next' }).click();

    const orgIdMatch = page.url().match(/org_[a-zA-Z0-9]+/);
    expect(orgIdMatch).toBeTruthy();
    const orgId = orgIdMatch![0];

    // Simulate payment completion
    await page.goto(`/api/stripe/success?organizationId=${orgId}&planType=starter`);
    await expect(page).toHaveURL(`/onboarding/${orgId}`);

    // Try to access product without completing onboarding
    await page.goto(`/${orgId}/frameworks`);

    // Should be redirected back to onboarding
    await expect(page).toHaveURL(`/onboarding/${orgId}`);

    // Try different product routes
    await page.goto(`/${orgId}/policies`);
    await expect(page).toHaveURL(`/onboarding/${orgId}`);

    await page.goto(`/${orgId}/vendors`);
    await expect(page).toHaveURL(`/onboarding/${orgId}`);
  });

  test('existing user can create additional organization', async ({ page }) => {
    // This assumes we have a test user with existing org
    // First complete one org setup
    const firstOrg = generateTestData();
    const firstWebsite = `example${Date.now()}.com`;

    // Authenticate user first
    await authenticateTestUser(page, {
      email: firstOrg.email,
      name: firstOrg.userName,
      skipOrg: true,
    });

    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Select framework
    const checkedFrameworks = await page.locator('input[type="checkbox"]:checked').count();
    if (checkedFrameworks === 0) {
      await page.locator('label:has-text("SOC 2")').click();
    }
    await page.getByRole('button', { name: 'Next' }).click();

    // Fill organization name
    await page.waitForSelector('input[name="organizationName"]', { timeout: 10000 });
    await page.locator('input[name="organizationName"]').fill(firstOrg.organizationName);
    await page.getByRole('button', { name: 'Next' }).click();

    // Fill website
    await page.waitForSelector('input[name="website"]', { timeout: 10000 });
    await page.locator('input[name="website"]').fill(firstWebsite);
    await page.getByRole('button', { name: 'Next' }).click();

    const firstOrgIdMatch = page.url().match(/org_[a-zA-Z0-9]+/);
    const firstOrgId = firstOrgIdMatch ? firstOrgIdMatch[0] : null;
    expect(firstOrgId).toBeTruthy();

    // Now create additional org using dropdown
    await page.goto(`/upgrade/${firstOrgId}`);

    // Try navigating directly to setup with intent
    await page.goto('/setup?intent=create-additional');

    // Should redirect to /setup/[setupId] with intent preserved
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+\?intent=create-additional/, { timeout: 10000 });

    // Complete setup for second org
    const secondOrg = generateTestData();
    const secondWebsite = `example${Date.now() + 1}.com`;

    // Select a different framework
    await page.locator('label:has-text("ISO 27001")').click();
    await page.getByRole('button', { name: 'Next' }).click();

    // Fill organization name
    await page.waitForSelector('input[name="organizationName"]', { timeout: 10000 });
    await page.locator('input[name="organizationName"]').fill(secondOrg.organizationName);
    await page.getByRole('button', { name: 'Next' }).click();

    // Fill website
    await page.waitForSelector('input[name="website"]', { timeout: 10000 });
    await page.locator('input[name="website"]').fill(secondWebsite);
    await page.getByRole('button', { name: 'Next' }).click();

    // Should redirect to upgrade for the new org
    await expect(page).toHaveURL(/\/upgrade\/org_/);
    const secondOrgIdMatch = page.url().match(/org_[a-zA-Z0-9]+/);
    const secondOrgId = secondOrgIdMatch ? secondOrgIdMatch[0] : null;
    expect(secondOrgId).not.toBe(firstOrgId);
  });
});
