import { describe, expect, it } from 'vitest';
import type { BackgroundCheckBillingStatus } from './backgroundCheckTypes';
import { getBackgroundChecksRemaining } from './useEmployeeBackgroundCheckData';

function status(
  overrides: Partial<BackgroundCheckBillingStatus> = {},
): BackgroundCheckBillingStatus {
  return {
    hasPaymentMethod: false,
    setupAt: null,
    ...overrides,
  };
}

describe('getBackgroundChecksRemaining', () => {
  it('returns null when billing status has not loaded', () => {
    expect(getBackgroundChecksRemaining({ billingStatus: undefined })).toBeNull();
  });

  it('returns null when no subscription and no wallet credits exist', () => {
    expect(getBackgroundChecksRemaining({ billingStatus: status() })).toBeNull();
  });

  it('returns subscription remainder when an active subscription exists', () => {
    expect(
      getBackgroundChecksRemaining({
        billingStatus: status({
          subscriptions: [
            {
              skuKey: 'background_checks_monthly_3',
              status: 'active',
              includedQuantity: 3,
              usedQuantity: 1,
              currentPeriodStart: null,
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
            },
          ],
        }),
      }),
    ).toBe(2);
  });

  it('returns wallet balance when no subscription but wallet credits exist', () => {
    // Admin grant flow: organization has no subscription, platform
    // admin granted 5 BG-check credits. Backend would consume from
    // wallet on POST, so the wizard must allow the request.
    expect(
      getBackgroundChecksRemaining({
        billingStatus: status({
          creditBalances: [{ productKey: 'background_check', balance: 5 }],
        }),
      }),
    ).toBe(5);
  });

  it('sums subscription remainder and wallet credits', () => {
    expect(
      getBackgroundChecksRemaining({
        billingStatus: status({
          subscriptions: [
            {
              skuKey: 'background_checks_monthly_3',
              status: 'trialing',
              includedQuantity: 3,
              usedQuantity: 3,
              currentPeriodStart: null,
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
            },
          ],
          creditBalances: [{ productKey: 'background_check', balance: 5 }],
        }),
      }),
    ).toBe(5);
  });

  it('ignores pentest wallet credits when computing background-check allowance', () => {
    expect(
      getBackgroundChecksRemaining({
        billingStatus: status({
          creditBalances: [{ productKey: 'pentest', balance: 10 }],
        }),
      }),
    ).toBeNull();
  });

  it('ignores cancelled subscriptions', () => {
    expect(
      getBackgroundChecksRemaining({
        billingStatus: status({
          subscriptions: [
            {
              skuKey: 'background_checks_monthly_3',
              status: 'canceled',
              includedQuantity: 3,
              usedQuantity: 0,
              currentPeriodStart: null,
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
            },
          ],
          creditBalances: [{ productKey: 'background_check', balance: 2 }],
        }),
      }),
    ).toBe(2);
  });
});
