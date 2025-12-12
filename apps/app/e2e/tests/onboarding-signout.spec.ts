import { expect, test } from '@playwright/test';
import { authenticateTestUser, clearAuth, grantAccess } from '../utils/auth-helpers';
import { generateTestData } from '../utils/helpers';

test.describe('Onboarding Sign Out Flow', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('user can sign out from onboarding to switch email', async ({ page }) => {
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: true,
    });

    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/);

    await page.waitForSelector('input[type="checkbox"]:checked');
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          '[data-testid="setup-next-button"]',
        ) as HTMLButtonElement;
        return button && !button.disabled && button.offsetParent !== null;
      },
      { timeout: 10000 },
    );
    await page.waitForTimeout(500);
    await page.getByTestId('setup-next-button').click();

    await page.getByPlaceholder('e.g., Acme Inc.').fill(testData.organizationName);
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          '[data-testid="setup-next-button"]',
        ) as HTMLButtonElement;
        return button && !button.disabled && button.offsetParent !== null;
      },
      { timeout: 5000 },
    );
    await page.waitForTimeout(300);
    await page.getByTestId('setup-next-button').click();

    await page.getByPlaceholder('example.com').fill(website);
    await Promise.all([
      page.waitForURL(/\/upgrade\/org_/),
      page.getByTestId('setup-finish-button').click(),
    ]);

    const orgId = page.url().match(/org_[a-zA-Z0-9]+/)?.[0];
    expect(orgId).toBeTruthy();

    await grantAccess(page, orgId!, true);
    await page.reload();

    await expect(page).toHaveURL(`/onboarding/${orgId!}`);
    await expect(page.getByText('Step 1 of 9')).toBeVisible();

    const avatarTrigger = page.getByTestId('onboarding-user-menu-trigger');
    await expect(avatarTrigger).toBeVisible();
    await avatarTrigger.click();

    const signOutButton = page.getByTestId('onboarding-sign-out');
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();

    await expect(page).toHaveURL(/\/auth/);

    await page.goto(`/onboarding/${orgId!}`);
    await expect(page).toHaveURL(/\/auth/);
  });

  test('onboarding avatar menu displays user info', async ({ page }) => {
    const testData = generateTestData();
    const website = `example${Date.now()}.com`;

    await authenticateTestUser(page, {
      email: testData.email,
      name: testData.userName,
      skipOrg: true,
      hasAccess: true,
    });

    await page.goto('/setup');
    await page.waitForURL(/\/setup\/[a-zA-Z0-9]+/);

    await page.waitForSelector('input[type="checkbox"]:checked');
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          '[data-testid="setup-next-button"]',
        ) as HTMLButtonElement;
        return button && !button.disabled && button.offsetParent !== null;
      },
      { timeout: 10000 },
    );
    await page.waitForTimeout(500);
    await page.getByTestId('setup-next-button').click();

    await page.getByPlaceholder('e.g., Acme Inc.').fill(testData.organizationName);
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          '[data-testid="setup-next-button"]',
        ) as HTMLButtonElement;
        return button && !button.disabled && button.offsetParent !== null;
      },
      { timeout: 5000 },
    );
    await page.waitForTimeout(300);
    await page.getByTestId('setup-next-button').click();

    await page.getByPlaceholder('example.com').fill(website);
    await Promise.all([
      page.waitForURL(/\/upgrade\/org_/),
      page.getByTestId('setup-finish-button').click(),
    ]);

    const orgId = page.url().match(/org_[a-zA-Z0-9]+/)?.[0];
    expect(orgId).toBeTruthy();

    await grantAccess(page, orgId!, true);
    await page.reload();

    await expect(page).toHaveURL(`/onboarding/${orgId!}`);

    const avatarTrigger = page.getByTestId('onboarding-user-menu-trigger');
    await expect(avatarTrigger).toBeVisible();
    await avatarTrigger.click();

    await expect(page.getByText(testData.userName)).toBeVisible();
    await expect(page.getByText(testData.email)).toBeVisible();
  });
});
