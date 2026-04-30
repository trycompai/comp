export type BillingCatalogEnvironment = 'test';

export type BillingSkuKey =
  | 'background_check_one_time'
  | 'background_checks_monthly_25'
  | 'pentest_monthly_5';

export type BillingProductKey = 'background_check' | 'pentest';

export type BillingCadence = 'one_time' | 'month';

export type BillingSku = {
  key: BillingSkuKey;
  productKey: BillingProductKey;
  name: string;
  description: string;
  cadence: BillingCadence;
  currency: 'usd';
  unitAmount: number;
  stripeProductId: string;
  stripePriceId: string;
  includedUsage?: {
    quantity: number;
    unit: 'background_check' | 'scan';
    reset: 'monthly';
  };
};

export const subscriptionBillingSkuKeys = [
  'background_checks_monthly_25',
  'pentest_monthly_5',
] as const satisfies readonly BillingSkuKey[];

export type BillingCatalog = {
  environment: BillingCatalogEnvironment;
  products: Record<BillingProductKey, string>;
  prices: Record<BillingSkuKey, string>;
  skus: Record<BillingSkuKey, BillingSku>;
};

const testSkus = {
  background_check_one_time: {
    key: 'background_check_one_time',
    productKey: 'background_check',
    name: 'Employee Background Check',
    description: 'One-time employee background check.',
    cadence: 'one_time',
    currency: 'usd',
    unitAmount: 4900,
    stripeProductId: 'prod_UQNNIS1di6uOLB',
    stripePriceId: 'price_1TRWckCkFWhKYvHIA1GLv1sO',
  },
  background_checks_monthly_25: {
    key: 'background_checks_monthly_25',
    productKey: 'background_check',
    name: 'Background Checks Monthly',
    description:
      'Monthly Comp AI background check package. Includes 25 checks per month.',
    cadence: 'month',
    currency: 'usd',
    unitAmount: 24900,
    stripeProductId: 'prod_UQNNIS1di6uOLB',
    stripePriceId: 'price_1TRya7CkFWhKYvHIDbCWSITp',
    includedUsage: {
      quantity: 25,
      unit: 'background_check',
      reset: 'monthly',
    },
  },
  pentest_monthly_5: {
    key: 'pentest_monthly_5',
    productKey: 'pentest',
    name: 'Penetration Tests Monthly',
    description:
      'Monthly Comp AI penetration testing package. Includes 5 scans per month.',
    cadence: 'month',
    currency: 'usd',
    unitAmount: 39900,
    stripeProductId: 'prod_UQqGJryNvXajUt',
    stripePriceId: 'price_1TRya6CkFWhKYvHI1sJ2M2no',
    includedUsage: {
      quantity: 5,
      unit: 'scan',
      reset: 'monthly',
    },
  },
} satisfies Record<BillingSkuKey, BillingSku>;

export const billingCatalogs = {
  test: createCatalog({ environment: 'test', skus: testSkus }),
} satisfies Record<BillingCatalogEnvironment, BillingCatalog>;

export function getBillingCatalog(
  environment: BillingCatalogEnvironment = 'test',
): BillingCatalog {
  return billingCatalogs[environment];
}

export function getBillingSku(params: {
  environment?: BillingCatalogEnvironment;
  skuKey: BillingSkuKey;
}): BillingSku {
  const catalog = getBillingCatalog(params.environment);
  return catalog.skus[params.skuKey];
}

export function getBillingSkuByStripePriceId(params: {
  environment?: BillingCatalogEnvironment;
  stripePriceId: string;
}): BillingSku | null {
  const catalog = getBillingCatalog(params.environment);
  return (
    Object.values(catalog.skus).find(
      (sku) => sku.stripePriceId === params.stripePriceId,
    ) ?? null
  );
}

export function isSubscriptionBillingSkuKey(value: string): value is BillingSkuKey {
  return subscriptionBillingSkuKeys.some((skuKey) => skuKey === value);
}

function createCatalog(params: {
  environment: BillingCatalogEnvironment;
  skus: Record<BillingSkuKey, BillingSku>;
}): BillingCatalog {
  return {
    environment: params.environment,
    products: {
      background_check: params.skus.background_check_one_time.stripeProductId,
      pentest: params.skus.pentest_monthly_5.stripeProductId,
    },
    prices: {
      background_check_one_time:
        params.skus.background_check_one_time.stripePriceId,
      background_checks_monthly_25:
        params.skus.background_checks_monthly_25.stripePriceId,
      pentest_monthly_5: params.skus.pentest_monthly_5.stripePriceId,
    },
    skus: params.skus,
  };
}
