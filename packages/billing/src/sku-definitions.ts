import type { BillingSku, BillingSkuKey } from './index';

export function createSkus(params: {
  products: { backgroundCheck: string; pentest: string };
  legacyProducts: { backgroundCheck: string; pentest: string };
  prices: Record<BillingSkuKey, string>;
}): Record<BillingSkuKey, BillingSku> {
  return {
    background_check_one_time: {
      key: 'background_check_one_time',
      productKey: 'background_check',
      name: 'Employee Background Check',
      description: 'One-time employee background check.',
      cadence: 'one_time',
      currency: 'usd',
      unitAmount: 4900,
      stripeProductId: params.legacyProducts.backgroundCheck,
      stripePriceId: params.prices.background_check_one_time,
      deprecated: true,
    },
    background_checks_monthly_3: {
      key: 'background_checks_monthly_3',
      productKey: 'background_check',
      name: 'Hiring Starter',
      description: 'Premium screening coverage for your next trusted hires.',
      cadence: 'month',
      currency: 'usd',
      unitAmount: 7900,
      stripeProductId: params.products.backgroundCheck,
      stripePriceId: params.prices.background_checks_monthly_3,
      includedUsage: { quantity: 3, unit: 'background_check', reset: 'monthly' },
      trialDays: 14,
    },
    background_checks_monthly_10: {
      key: 'background_checks_monthly_10',
      productKey: 'background_check',
      name: 'Hiring Momentum',
      description: 'Predictable coverage for steady recruiting pipelines.',
      cadence: 'month',
      currency: 'usd',
      unitAmount: 19900,
      stripeProductId: params.products.backgroundCheck,
      stripePriceId: params.prices.background_checks_monthly_10,
      includedUsage: { quantity: 10, unit: 'background_check', reset: 'monthly' },
    },
    background_checks_monthly_20: {
      key: 'background_checks_monthly_20',
      productKey: 'background_check',
      name: 'Hiring Scale',
      description: 'High-volume screening with finance-friendly spend control.',
      cadence: 'month',
      currency: 'usd',
      unitAmount: 39900,
      stripeProductId: params.products.backgroundCheck,
      stripePriceId: params.prices.background_checks_monthly_20,
      includedUsage: { quantity: 20, unit: 'background_check', reset: 'monthly' },
    },
    background_checks_monthly_25: {
      key: 'background_checks_monthly_25',
      productKey: 'background_check',
      name: 'Background Checks Monthly',
      description: 'Legacy monthly package. Includes 25 checks per month.',
      cadence: 'month',
      currency: 'usd',
      unitAmount: 24900,
      stripeProductId: params.legacyProducts.backgroundCheck,
      stripePriceId: params.prices.background_checks_monthly_25,
      includedUsage: { quantity: 25, unit: 'background_check', reset: 'monthly' },
      deprecated: true,
    },
    pentest_monthly_1: {
      key: 'pentest_monthly_1',
      productKey: 'pentest',
      name: 'Launch Guard',
      description: "One premium monthly scan for your app's most important surface.",
      cadence: 'month',
      currency: 'usd',
      unitAmount: 29900,
      stripeProductId: params.products.pentest,
      stripePriceId: params.prices.pentest_monthly_1,
      includedUsage: { quantity: 1, unit: 'scan', reset: 'monthly' },
      trialDays: 14,
    },
    pentest_monthly_3: {
      key: 'pentest_monthly_3',
      productKey: 'pentest',
      name: 'Release Shield',
      description: 'Three scans for launch windows, retests, and customer-facing apps.',
      cadence: 'month',
      currency: 'usd',
      unitAmount: 49900,
      stripeProductId: params.products.pentest,
      stripePriceId: params.prices.pentest_monthly_3,
      includedUsage: { quantity: 3, unit: 'scan', reset: 'monthly' },
    },
    pentest_monthly_5_current: {
      key: 'pentest_monthly_5_current',
      productKey: 'pentest',
      name: 'Continuous Assurance',
      description: 'Five scans for teams shipping across multiple critical surfaces.',
      cadence: 'month',
      currency: 'usd',
      unitAmount: 89900,
      stripeProductId: params.products.pentest,
      stripePriceId: params.prices.pentest_monthly_5_current,
      includedUsage: { quantity: 5, unit: 'scan', reset: 'monthly' },
    },
    pentest_monthly_4: legacyPentestSku({
      key: 'pentest_monthly_4',
      priceId: params.prices.pentest_monthly_4,
      productId: params.products.pentest,
      quantity: 4,
      unitAmount: 49900,
    }),
    pentest_monthly_10: legacyPentestSku({
      key: 'pentest_monthly_10',
      priceId: params.prices.pentest_monthly_10,
      productId: params.products.pentest,
      quantity: 10,
      unitAmount: 79900,
    }),
    pentest_monthly_5: legacyPentestSku({
      key: 'pentest_monthly_5',
      priceId: params.prices.pentest_monthly_5,
      productId: params.legacyProducts.pentest,
      quantity: 5,
      unitAmount: 39900,
    }),
  };
}

function legacyPentestSku(params: {
  key: 'pentest_monthly_4' | 'pentest_monthly_5' | 'pentest_monthly_10';
  priceId: string;
  productId: string;
  quantity: number;
  unitAmount: number;
}): BillingSku {
  return {
    key: params.key,
    productKey: 'pentest',
    name: 'Penetration Tests Legacy',
    description: `Legacy package. Includes ${params.quantity} scans per month.`,
    cadence: 'month',
    currency: 'usd',
    unitAmount: params.unitAmount,
    stripeProductId: params.productId,
    stripePriceId: params.priceId,
    includedUsage: { quantity: params.quantity, unit: 'scan', reset: 'monthly' },
    deprecated: true,
  };
}
