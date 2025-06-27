import { expect, test } from '@playwright/test';
import { generateTestData } from '../utils/helpers';

test.describe('Split Onboarding Flow', () => {
  test('new user completes split onboarding: 3 steps → payment → 9 steps → product access', async ({
    page,
  }) => {
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Start at setup
    await page.goto('/setup');

    // Step 1: Select framework
    await expect(page.getByText('Which compliance frameworks do you need?')).toBeVisible();
    await page.getByRole('checkbox', { name: 'SOC 2' }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Organization name
    await expect(page.getByText("What's your organization's name?")).toBeVisible();
    await page.getByPlaceholder("Enter your organization's name").fill(testData.organizationName);
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: Website
    await expect(page.getByText("What's your organization's domain?")).toBeVisible();
    await page.getByPlaceholder('example.com').fill(website);
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

    // First create org through minimal flow
    await page.goto('/setup');
    await page.getByRole('checkbox', { name: 'SOC 2' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByPlaceholder("Enter your organization's name").fill(testData.organizationName);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByPlaceholder('example.com').fill(website);
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

    await page.goto('/setup');
    await page.getByRole('checkbox', { name: 'SOC 2' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByPlaceholder("Enter your organization's name").fill(firstOrg.organizationName);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByPlaceholder('example.com').fill(firstWebsite);
    await page.getByRole('button', { name: 'Next' }).click();

    const firstOrgIdMatch = page.url().match(/org_[a-zA-Z0-9]+/);
    const firstOrgId = firstOrgIdMatch ? firstOrgIdMatch[0] : null;
    expect(firstOrgId).toBeTruthy();

    // Now create additional org using dropdown
    await page.goto(`/upgrade/${firstOrgId}`);

    // Open org switcher
    await page.getByRole('button', { name: firstOrg.organizationName }).click();
    await page.getByText('Create Organization').click();

    // Should be at setup with intent
    await expect(page).toHaveURL('/setup?intent=create-additional');

    // Complete setup for second org
    const secondOrg = generateTestData();
    const secondWebsite = `example${Date.now() + 1}.com`;

    await page.getByRole('checkbox', { name: 'ISO 27001' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByPlaceholder("Enter your organization's name").fill(secondOrg.organizationName);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByPlaceholder('example.com').fill(secondWebsite);
    await page.getByRole('button', { name: 'Next' }).click();

    // Should redirect to upgrade for the new org
    await expect(page).toHaveURL(/\/upgrade\/org_/);
    const secondOrgIdMatch = page.url().match(/org_[a-zA-Z0-9]+/);
    const secondOrgId = secondOrgIdMatch ? secondOrgIdMatch[0] : null;
    expect(secondOrgId).not.toBe(firstOrgId);
  });
});
