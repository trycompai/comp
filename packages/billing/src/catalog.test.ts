import { describe, expect, it } from 'bun:test';

import {
  getBillingCatalog,
  getBillingSku,
  getBillingSkuByStripePriceId,
  isSubscriptionBillingSkuKey,
} from './index';

describe('billing catalog', () => {
  it('records the test-mode subscription prices', () => {
    const catalog = getBillingCatalog('test');

    expect(catalog.products.pentest).toBe('prod_UQqGJryNvXajUt');
    expect(catalog.prices.pentest_monthly_5).toBe('price_1TRya6CkFWhKYvHI1sJ2M2no');
    expect(catalog.products.background_check).toBe('prod_UQNNIS1di6uOLB');
    expect(catalog.prices.background_checks_monthly_25).toBe('price_1TRya7CkFWhKYvHIDbCWSITp');
  });

  it('models included monthly usage for subscription skus', () => {
    expect(
      getBillingSku({ environment: 'test', skuKey: 'pentest_monthly_5' }).includedUsage,
    ).toEqual({ quantity: 5, unit: 'scan', reset: 'monthly' });

    expect(
      getBillingSku({
        environment: 'test',
        skuKey: 'background_checks_monthly_25',
      }).includedUsage,
    ).toEqual({ quantity: 25, unit: 'background_check', reset: 'monthly' });
  });

  it('finds skus by Stripe price id', () => {
    expect(
      getBillingSkuByStripePriceId({
        environment: 'test',
        stripePriceId: 'price_1TRya6CkFWhKYvHI1sJ2M2no',
      })?.key,
    ).toBe('pentest_monthly_5');
    expect(
      getBillingSkuByStripePriceId({
        environment: 'test',
        stripePriceId: 'price_missing',
      }),
    ).toBeNull();
  });

  it('recognizes subscription sku keys', () => {
    expect(isSubscriptionBillingSkuKey('pentest_monthly_5')).toBe(true);
    expect(isSubscriptionBillingSkuKey('background_check_one_time')).toBe(false);
  });
});
