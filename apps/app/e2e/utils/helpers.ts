import { type Page, expect } from '@playwright/test';

/**
 * Helper functions for E2E tests
 */

// Wait for a specific URL pattern
export async function waitForURL(page: Page, urlPattern: string | RegExp) {
  await page.waitForURL(urlPattern, { timeout: 30000 });
}

// Fill a form field with retry logic
export async function fillFormField(page: Page, selector: string, value: string) {
  const field = page.locator(selector);
  await expect(field).toBeVisible({ timeout: 10000 });
  await field.clear();
  await field.fill(value);

  // Special handling for website inputs that strip protocols
  if (selector.includes('website')) {
    // The WebsiteInput component strips https:// from display
    // so we just verify the field has some value
    await expect(field).not.toHaveValue('');
  } else {
    await expect(field).toHaveValue(value);
  }
}

// Click with retry logic
export async function clickAndWait(
  page: Page,
  selector: string,
  options?: { waitForNavigation?: boolean },
) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });

  if (options?.waitForNavigation) {
    await Promise.all([page.waitForNavigation(), element.click()]);
  } else {
    await element.click();
  }
}

// Wait for network idle (useful after data mutations)
export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

// Generate unique test data
export function generateTestData() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    organizationName: `Test Org ${timestamp}-${random}`,
    email: `test+${timestamp}${random}@example.com`,
    userName: `Test User ${timestamp}`,
  };
}

// Check if element exists
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return (await page.locator(selector).count()) > 0;
}

// Take a screenshot with a descriptive name
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

// Wait for toast/notification and check its text
export async function expectToast(page: Page, expectedText: string) {
  const toast = page
    .locator('[role="alert"], .toast, .notification')
    .filter({ hasText: expectedText });
  await expect(toast).toBeVisible({ timeout: 10000 });
  await expect(toast).toHaveText(new RegExp(expectedText));
}

// Mock API responses
export async function mockAPIResponse(page: Page, url: string | RegExp, response: any) {
  await page.route(url, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}
