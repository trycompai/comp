import { describe, expect, it } from 'bun:test';

import {
  getBillingCatalog,
  getBillingSku,
  getBillingSkuByStripePriceId,
  getSubscriptionBillingSkuKeysForProduct,
  isSubscriptionBillingSkuKey,
  resolveBillingCatalogEnvironment,
} from './index';

describe('billing catalog', () => {
  it('records test and live subscription products', () => {
    expect(getBillingCatalog('test').products).toEqual({
      pentest: 'prod_UQvQW6Pbh1HrEw',
      background_check: 'prod_UQvQYmEniNCyvI',
    });
    expect(getBillingCatalog('live').products).toEqual({
      pentest: 'prod_UQvQVLDFiaWxNf',
      background_check: 'prod_UQvQRREj9JaIh1',
    });
  });

  it('models included monthly usage for all purchasable subscription SKUs', () => {
    expect(
      getBillingSku({ environment: 'test', skuKey: 'pentest_monthly_1' }).includedUsage,
    ).toEqual({ quantity: 1, unit: 'scan', reset: 'monthly' });
    expect(
      getBillingSku({ environment: 'test', skuKey: 'pentest_monthly_3' }).includedUsage,
    ).toEqual({ quantity: 3, unit: 'scan', reset: 'monthly' });
    expect(
      getBillingSku({ environment: 'test', skuKey: 'pentest_monthly_5_current' }).includedUsage,
    ).toEqual({ quantity: 5, unit: 'scan', reset: 'monthly' });
    expect(
      getBillingSku({ environment: 'test', skuKey: 'background_checks_monthly_3' }).includedUsage,
    ).toEqual({ quantity: 3, unit: 'background_check', reset: 'monthly' });
    expect(
      getBillingSku({ environment: 'test', skuKey: 'background_checks_monthly_10' }).includedUsage,
    ).toEqual({ quantity: 10, unit: 'background_check', reset: 'monthly' });
    expect(
      getBillingSku({ environment: 'test', skuKey: 'background_checks_monthly_20' }).includedUsage,
    ).toEqual({ quantity: 20, unit: 'background_check', reset: 'monthly' });
  });

  it('offers 14-day trials only on the lowest subscription tiers', () => {
    expect(getBillingSku({ environment: 'test', skuKey: 'pentest_monthly_1' }).trialDays).toBe(14);
    expect(
      getBillingSku({ environment: 'test', skuKey: 'background_checks_monthly_3' }).trialDays,
    ).toBe(14);
    expect(
      getBillingSku({ environment: 'test', skuKey: 'pentest_monthly_3' }).trialDays,
    ).toBeUndefined();
    expect(
      getBillingSku({ environment: 'test', skuKey: 'background_checks_monthly_10' }).trialDays,
    ).toBeUndefined();
  });

  it('finds SKUs by Stripe price id across environments', () => {
    expect(
      getBillingSkuByStripePriceId({
        environment: 'test',
        stripePriceId: 'price_1TS3ziCkFWhKYvHI0H5TWxNI',
      })?.key,
    ).toBe('pentest_monthly_1');
    expect(
      getBillingSkuByStripePriceId({
        environment: 'live',
        stripePriceId: 'price_1TS3zVCxqPDT5y0WCsB6ywMP',
      })?.key,
    ).toBe('background_checks_monthly_20');
    expect(getBillingSkuByStripePriceId({ stripePriceId: 'price_missing' })).toBeNull();
  });

  it('recognizes only current subscription SKU keys as purchasable', () => {
    expect(isSubscriptionBillingSkuKey('pentest_monthly_1')).toBe(true);
    expect(isSubscriptionBillingSkuKey('pentest_monthly_3')).toBe(true);
    expect(isSubscriptionBillingSkuKey('background_checks_monthly_3')).toBe(true);
    expect(isSubscriptionBillingSkuKey('pentest_monthly_5')).toBe(false);
    expect(isSubscriptionBillingSkuKey('pentest_monthly_10')).toBe(false);
    expect(isSubscriptionBillingSkuKey('background_check_one_time')).toBe(false);
  });

  it('groups purchasable subscriptions by product', () => {
    expect(getSubscriptionBillingSkuKeysForProduct('pentest')).toEqual([
      'pentest_monthly_1',
      'pentest_monthly_3',
      'pentest_monthly_5_current',
    ]);
    expect(getSubscriptionBillingSkuKeysForProduct('background_check')).toEqual([
      'background_checks_monthly_3',
      'background_checks_monthly_10',
      'background_checks_monthly_20',
    ]);
  });

  it('resolves catalog environment from Stripe secret key prefix', () => {
    expect(resolveBillingCatalogEnvironment({ stripeSecretKey: 'sk_test_123' })).toBe('test');
    expect(resolveBillingCatalogEnvironment({ stripeSecretKey: 'sk_live_123' })).toBe('live');
    expect(resolveBillingCatalogEnvironment({ nodeEnv: 'development' })).toBe('test');
  });
});
