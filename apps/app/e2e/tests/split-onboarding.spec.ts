import { expect, test } from '@playwright/test';
import { authenticateTestUser, clearAuth, grantAccess } from '../utils/auth-helpers';
import { generateTestData } from '../utils/helpers';

test.describe('Split Onboarding Flow', () => {
  // New flow based on org.hasAccess column:
  //
  // 1. hasAccess = false: 3 setup steps → book a call → (after approval) 9 onboarding steps → product access
  // 2. hasAccess = true, incomplete onboarding: 3 setup steps → 9 onboarding steps → product access
  // 3. hasAccess = true, completed onboarding: redirect to app (skip setup/onboarding)
  //
  // Users with incomplete onboarding (even if hasAccess=true) are redirected from product pages to onboarding

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await clearAuth(page);
  });

  test('new user without access: 3 steps → book call (blocked from onboarding/product)', async ({
    page,
  }) => {
    // Tests the flow for a new user who doesn't have access (hasAccess = false)
    // They complete setup, see the book a call page, and are blocked from accessing onboarding/product
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user first
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true, // Don't create org, user will go through setup
      hasAccess: false, // This user doesn't have access initially
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

    // Extract orgId from URL
    const orgIdMatch = page.url().match(/org_[a-zA-Z0-9]+/);
    expect(orgIdMatch).toBeTruthy();
    const orgId = orgIdMatch![0];

    // If they haven't booked a call (hasAccess is false), they see a book a call page.
    await expect(page.getByText(`Let's get ${testData.organizationName} approved`)).toBeVisible();
    await expect(
      page.getByText(
        'A quick 20-minute call with our team to understand your compliance needs and approve your organization for access.',
      ),
    ).toBeVisible();

    // For this test, we'll stop here since the user doesn't have access
    // In a real scenario, they would book a call and get approved
    // but for testing purposes, we'll just verify they see the book a call page

    // Try to access onboarding directly - should be redirected back to upgrade
    await page.goto(`/onboarding/${orgId}`);
    await expect(page).toHaveURL(`/upgrade/${orgId}`);

    // Try to access product pages - should be redirected back to upgrade
    await page.goto(`/${orgId}/frameworks`);
    await expect(page).toHaveURL(`/upgrade/${orgId}`);

    await page.goto(`/${orgId}/policies`);
    await expect(page).toHaveURL(`/upgrade/${orgId}`);
  });

  test('user with access but incomplete onboarding: 3 steps → directly to onboarding', async ({
    page,
  }) => {
    // Tests user who has access (hasAccess = true) but hasn't completed onboarding
    // They skip the book a call step and go directly to onboarding
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user first
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: true, // This user has access
    });

    // Navigate to setup
    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Complete the 3 initial steps
    // Step 1: Select framework
    await expect(page.locator('text=/compliance frameworks/i').first()).toBeVisible({
      timeout: 10000,
    });
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

    // Extract orgId from URL
    const orgIdMatch = page.url().match(/org_[a-zA-Z0-9]+/);
    expect(orgIdMatch).toBeTruthy();
    const orgId = orgIdMatch![0];

    // Since the user has access (hasAccess = true), they should be redirected directly to onboarding
    // This bypasses the book a call step
    await page.goto(`/onboarding/${orgId}`);
    await expect(page).toHaveURL(`/onboarding/${orgId}`);

    // Should see step 4 (describe) - no book a call step
    await expect(page.getByText('Step 4 of 12')).toBeVisible();
    await expect(page.getByText('Tell us a bit about your business')).toBeVisible();
  });

  test('user with access but incomplete onboarding: redirected from product to onboarding', async ({
    page,
    context,
  }) => {
    // Tests user who has access (hasAccess = true) but hasn't completed onboarding
    // When they try to access product pages, they should be redirected to onboarding
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user first
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: true, // This user has access
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

    // Since the user has access (hasAccess = true), they can access onboarding
    await page.goto(`/onboarding/${orgId}`);
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

  test('user with access and completed onboarding: redirected from setup/onboarding to app', async ({
    page,
  }) => {
    // Tests user who has access (hasAccess = true) and completed onboarding
    // They should be redirected from setup/upgrade/onboarding pages directly to the app
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user first
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: true, // This user has access
    });

    // First create org through setup flow
    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Complete the 3 initial steps
    // Step 1: Select framework
    await expect(page.locator('text=/compliance frameworks/i').first()).toBeVisible({
      timeout: 10000,
    });
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

    // Extract orgId from URL
    const orgIdMatch = page.url().match(/org_[a-zA-Z0-9]+/);
    expect(orgIdMatch).toBeTruthy();
    const orgId = orgIdMatch![0];

    // Since the user has access (hasAccess = true), they can access onboarding
    await page.goto(`/onboarding/${orgId}`);

    // Complete all onboarding steps quickly to simulate a completed state
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

    // Now test that user with completed onboarding goes directly to app
    // When they try to access /setup, /upgrade, or /onboarding, they should be redirected
    await page.goto('/setup');
    await expect(page).toHaveURL(`/${orgId}/frameworks`);

    await page.goto(`/upgrade/${orgId}`);
    await expect(page).toHaveURL(`/${orgId}/frameworks`);

    await page.goto(`/onboarding/${orgId}`);
    await expect(page).toHaveURL(`/${orgId}/frameworks`);

    // Should have access to all product pages
    await page.goto(`/${orgId}/policies`);
    await expect(page).toHaveURL(`/${orgId}/policies`);

    await page.goto(`/${orgId}/vendors`);
    await expect(page).toHaveURL(`/${orgId}/vendors`);
  });

  test('user blocked by hasAccess → grant access → refresh shows onboarding', async ({ page }) => {
    // Tests the flow where user is initially blocked, then access is granted, then they can access onboarding
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user first (without access)
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: false, // This user doesn't have access initially
    });

    // Navigate to setup
    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/, { timeout: 10000 });

    // Complete the 3 initial steps
    // Step 1: Select framework
    await expect(page.locator('text=/compliance frameworks/i').first()).toBeVisible({
      timeout: 10000,
    });
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

    // Extract orgId from URL
    const orgIdMatch = page.url().match(/org_[a-zA-Z0-9]+/);
    expect(orgIdMatch).toBeTruthy();
    const orgId = orgIdMatch![0];

    // Verify they see the book a call page (blocked by hasAccess = false)
    await expect(page.getByText(`Let's get ${testData.organizationName} approved`)).toBeVisible();
    await expect(
      page.getByText(
        'A quick 20-minute call with our team to understand your compliance needs and approve your organization for access.',
      ),
    ).toBeVisible();

    // Verify they can't access onboarding or product pages
    await page.goto(`/onboarding/${orgId}`);
    await expect(page).toHaveURL(`/upgrade/${orgId}`);

    await page.goto(`/${orgId}/frameworks`);
    await expect(page).toHaveURL(`/upgrade/${orgId}`);

    // Now simulate access being granted (like after a successful call)
    await grantAccess(page, orgId, true);

    // Refresh the page - they should now be able to access onboarding
    await page.reload();

    // They should now be redirected to onboarding
    await expect(page).toHaveURL(`/onboarding/${orgId}`);

    // Verify they can see the onboarding content
    await expect(page.getByText('Step 4 of 12')).toBeVisible();
    await expect(page.getByText('Tell us a bit about your business')).toBeVisible();

    // Verify they can now access onboarding directly
    await page.goto(`/onboarding/${orgId}`);
    await expect(page).toHaveURL(`/onboarding/${orgId}`);

    // But if they try to access product pages, they should be redirected to onboarding
    // (since they have access but haven't completed onboarding)
    await page.goto(`/${orgId}/frameworks`);
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
      hasAccess: true, // This user has access
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
