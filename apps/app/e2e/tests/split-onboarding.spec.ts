import { expect, test } from '@playwright/test';
import { authenticateTestUser, clearAuth, grantAccess } from '../utils/auth-helpers';
import { generateTestData } from '../utils/helpers';

test.describe('Split Onboarding Flow', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('new user without access: 3 steps → book call', async ({ page }) => {
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user without access
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: false,
    });

    // Go to setup
    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/);

    // Step 1: Framework selection - wait for it to be auto-selected
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    await expect(page.getByText('Which compliance frameworks do you need?')).toBeVisible();

    // Wait for frameworks to load and one to be auto-selected
    await page.waitForSelector('input[type="checkbox"]:checked');

    // Click Next
    await page.getByTestId('setup-next-button').click();

    // Step 2: Organization name
    await expect(page.getByText('Step 2 of 3')).toBeVisible();
    await expect(page.getByText('What is your company name?')).toBeVisible();

    await page.getByPlaceholder('e.g., Acme Inc.').fill(testData.organizationName);
    await page.getByTestId('setup-next-button').click();

    // Step 3: Website
    await expect(page.getByText('Step 3 of 3')).toBeVisible();
    await expect(page.getByText("What's your company website?")).toBeVisible();

    await page.getByPlaceholder('example.com').fill(website);

    // Click Finish and wait for redirect
    await Promise.all([
      page.waitForURL(/\/upgrade\/org_/),
      page.getByTestId('setup-finish-button').click(),
    ]);

    // Should see book a call page
    await expect(page.getByText(`Let's get ${testData.organizationName} approved`)).toBeVisible();
    await expect(page.getByText('A quick 20-minute call with our team')).toBeVisible();
  });

  test('user creates org → book call → gets access → onboarding', async ({ page }) => {
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user with access
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: true,
    });

    // Go to setup
    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/);

    // Step 1: Framework selection
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    await page.waitForSelector('input[type="checkbox"]:checked');
    await page.getByTestId('setup-next-button').click();

    // Step 2: Organization name
    await expect(page.getByText('Step 2 of 3')).toBeVisible();
    await page.getByPlaceholder('e.g., Acme Inc.').fill(testData.organizationName);
    await page.getByTestId('setup-next-button').click();

    // Step 3: Website
    await expect(page.getByText('Step 3 of 3')).toBeVisible();
    await page.getByPlaceholder('example.com').fill(website);

    // Click Finish and wait for redirect - NEW ORGS ALWAYS GO TO BOOK CALL FIRST
    await Promise.all([
      page.waitForURL(/\/upgrade\/org_/),
      page.getByTestId('setup-finish-button').click(),
    ]);

    // Even users with access get redirected to book call for NEW organizations
    await expect(page.getByText(`Let's get ${testData.organizationName} approved`)).toBeVisible();
    await expect(page.getByText('A quick 20-minute call with our team')).toBeVisible();

    // Extract orgId to grant access and test the onboarding flow
    const orgId = page.url().match(/org_[a-zA-Z0-9]+/)?.[0];
    expect(orgId).toBeTruthy();

    // Now grant access (simulating Lewis manually approving the org)
    await grantAccess(page, orgId!, true);
    await page.reload();

    // Should now redirect to onboarding
    await expect(page).toHaveURL(`/onboarding/${orgId!}`);
    await expect(page.getByText('Step 1 of 9')).toBeVisible();
    await expect(page.getByText('Describe your company in a few sentences')).toBeVisible();
  });

  test('user with approved org: redirected from product to onboarding', async ({ page }) => {
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user with access
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: true,
    });

    // Complete setup to create org
    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/);

    // Go through 3 steps quickly
    await page.waitForSelector('input[type="checkbox"]:checked');
    // Wait for the button to be enabled (form validation needs to catch up)
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          '[data-testid="setup-next-button"]',
        ) as HTMLButtonElement;
        return button && !button.disabled && button.offsetParent !== null;
      },
      { timeout: 10000 },
    );
    await page.waitForTimeout(500); // Brief pause for stability
    await page.getByTestId('setup-next-button').click();

    await page.getByPlaceholder('e.g., Acme Inc.').fill(testData.organizationName);
    // Wait for the button to be enabled after filling the organization name
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          '[data-testid="setup-next-button"]',
        ) as HTMLButtonElement;
        return button && !button.disabled && button.offsetParent !== null;
      },
      { timeout: 5000 },
    );
    await page.waitForTimeout(300); // Brief pause for stability
    await page.getByTestId('setup-next-button').click();

    await page.getByPlaceholder('example.com').fill(website);
    await Promise.all([
      page.waitForURL(/\/upgrade\/org_/),
      page.getByTestId('setup-finish-button').click(),
    ]);

    // Extract orgId from current URL
    const orgId = page.url().match(/org_[a-zA-Z0-9]+/)?.[0];
    expect(orgId).toBeTruthy();

    // Grant access (simulating Lewis manually approving the org)
    await grantAccess(page, orgId!, true);
    await page.reload();

    // Should now be on onboarding
    await expect(page).toHaveURL(`/onboarding/${orgId!}`);

    // Try to access product pages - should redirect back to onboarding since onboarding not completed
    await page.goto(`/${orgId!}/frameworks`);
    await expect(page).toHaveURL(/\/onboarding\/org_/);

    await page.goto(`/${orgId!}/policies`);
    await expect(page).toHaveURL(/\/onboarding\/org_/);
  });

  test('completed user redirected from setup to app', async ({ page }) => {
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user with access
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: true,
    });

    // Complete setup
    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/);

    await page.waitForSelector('input[type="checkbox"]:checked');
    // Wait for the button to be enabled (form validation needs to catch up)
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          '[data-testid="setup-next-button"]',
        ) as HTMLButtonElement;
        return button && !button.disabled && button.offsetParent !== null;
      },
      { timeout: 10000 },
    );
    await page.waitForTimeout(500); // Brief pause for stability
    await page.getByTestId('setup-next-button').click();

    await page.getByPlaceholder('e.g., Acme Inc.').fill(testData.organizationName);
    // Wait for the button to be enabled after filling the organization name
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          '[data-testid="setup-next-button"]',
        ) as HTMLButtonElement;
        return button && !button.disabled && button.offsetParent !== null;
      },
      { timeout: 5000 },
    );
    await page.waitForTimeout(300); // Brief pause for stability
    await page.getByTestId('setup-next-button').click();

    await page.getByPlaceholder('example.com').fill(website);
    await Promise.all([
      page.waitForURL(/\/upgrade\/org_/),
      page.getByTestId('setup-finish-button').click(),
    ]);

    const orgId = page.url().match(/org_[a-zA-Z0-9]+/)?.[0];
    expect(orgId).toBeTruthy();

    // Grant access (simulating Lewis manually approving the org)
    await grantAccess(page, orgId!, true);
    await page.reload();

    // Should now be on onboarding
    await expect(page).toHaveURL(`/onboarding/${orgId!}`);

    // Complete onboarding quickly - all 9 steps

    // Step 1: Describe company
    await page
      .getByTestId('onboarding-input-describe')
      .fill('We are a test company that provides compliance solutions.');
    await page.getByTestId('onboarding-next-button').click();

    // Step 2: Industry (dropdown)
    await page.getByTestId('onboarding-input-industry').click();
    await page.waitForSelector('[data-testid="onboarding-option-saas"]', { state: 'visible' });
    await page.getByTestId('onboarding-option-saas').click();
    await page.getByTestId('onboarding-next-button').click();

    // Step 3: Team size (dropdown)
    await page.getByTestId('onboarding-input-teamSize').click();
    await page.waitForSelector('[data-testid="onboarding-option-11-50"]', { state: 'visible' });
    await page.getByTestId('onboarding-option-11-50').click();
    await page.getByTestId('onboarding-next-button').click();

    // Step 4: Devices (multi-select)
    await page.getByTestId('onboarding-input-devices-search').click();
    await page.waitForSelector(
      '[data-testid="onboarding-input-devices-search-option-company-provided-laptops"]',
      { state: 'visible' },
    );
    await page
      .getByTestId('onboarding-input-devices-search-option-company-provided-laptops')
      .click();
    await page.getByTestId('onboarding-next-button').click();

    // Step 5: Authentication (multi-select)
    await page.getByTestId('onboarding-input-authentication-search').click();
    await page.waitForSelector(
      '[data-testid="onboarding-input-authentication-search-option-google-workspace"]',
      { state: 'visible' },
    );
    await page
      .getByTestId('onboarding-input-authentication-search-option-google-workspace')
      .click();
    await page.getByTestId('onboarding-next-button').click();

    // Step 6: Software (multi-select)
    await page.getByTestId('onboarding-input-software-search').click();
    await page.waitForSelector('[data-testid="onboarding-input-software-search-option-github"]', {
      state: 'visible',
    });
    await page.getByTestId('onboarding-input-software-search-option-github').click();
    await page.getByTestId('onboarding-next-button').click();

    // Step 7: Work location (dropdown)
    await page.getByTestId('onboarding-input-workLocation').click();
    await page.waitForSelector('[data-testid="onboarding-option-fully-remote"]', {
      state: 'visible',
    });
    await page.getByTestId('onboarding-option-fully-remote').click();
    await page.getByTestId('onboarding-next-button').click();

    // Step 8: Infrastructure (multi-select)
    await page.getByTestId('onboarding-input-infrastructure-search').click();
    await page.waitForSelector(
      '[data-testid="onboarding-input-infrastructure-search-option-aws"]',
      { state: 'visible' },
    );
    await page.getByTestId('onboarding-input-infrastructure-search-option-aws').click();
    await page.getByTestId('onboarding-next-button').click();

    // Step 9: Data types (multi-select) - Final step
    await page.getByTestId('onboarding-input-dataTypes-search').click();
    await page.waitForSelector(
      '[data-testid="onboarding-input-dataTypes-search-option-customer-pii"]',
      { state: 'visible' },
    );
    await page.getByTestId('onboarding-input-dataTypes-search-option-customer-pii').click();

    // Final step - Complete Setup button
    await page.getByTestId('onboarding-next-button').click();

    // Wait for the redirect chain: /onboarding/org_xxx → /org_xxx/ → /org_xxx/frameworks
    await page.waitForURL(`/${orgId!}/frameworks`, { timeout: 10000 });

    // Now test redirects for completed user
    await page.goto('/setup');
    await expect(page).toHaveURL(`/${orgId!}/frameworks`);

    await page.goto(`/upgrade/${orgId!}`);
    await expect(page).toHaveURL(`/${orgId!}/frameworks`);
  });

  test('user without access gets blocked then granted access', async ({ page }) => {
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    // Authenticate user without access
    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: false,
    });

    // Complete setup to get to book call page
    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/);

    await page.waitForSelector('input[type="checkbox"]:checked');
    // Wait for the button to be enabled (form validation needs to catch up)
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          '[data-testid="setup-next-button"]',
        ) as HTMLButtonElement;
        return button && !button.disabled && button.offsetParent !== null;
      },
      { timeout: 10000 },
    );
    await page.waitForTimeout(500); // Brief pause for stability
    await page.getByTestId('setup-next-button').click();

    await page.getByPlaceholder('e.g., Acme Inc.').fill(testData.organizationName);
    // Wait for the button to be enabled after filling the organization name
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          '[data-testid="setup-next-button"]',
        ) as HTMLButtonElement;
        return button && !button.disabled && button.offsetParent !== null;
      },
      { timeout: 5000 },
    );
    await page.waitForTimeout(300); // Brief pause for stability
    await page.getByTestId('setup-next-button').click();

    await page.getByPlaceholder('example.com').fill(website);
    await Promise.all([
      page.waitForURL(/\/upgrade\/org_/),
      page.getByTestId('setup-finish-button').click(),
    ]);

    const orgId = page.url().match(/org_[a-zA-Z0-9]+/)?.[0];
    expect(orgId).toBeTruthy();

    // Verify blocked
    await expect(page.getByText(`Let's get ${testData.organizationName} approved`)).toBeVisible();

    // Try accessing onboarding - should be blocked
    await page.goto(`/onboarding/${orgId!}`);
    await expect(page).toHaveURL(`/upgrade/${orgId!}`);

    // Grant access
    await grantAccess(page, orgId!, true);
    await page.reload();

    // Should now redirect to onboarding
    await expect(page).toHaveURL(`/onboarding/${orgId!}`);
    await expect(page.getByText('Step 1 of 9')).toBeVisible();
  });
});
