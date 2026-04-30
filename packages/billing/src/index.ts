import { createSkus } from './sku-definitions';

export type BillingCatalogEnvironment = 'test' | 'live';

export type BillingSkuKey =
  | 'background_check_one_time'
  | 'background_checks_monthly_3'
  | 'background_checks_monthly_10'
  | 'background_checks_monthly_20'
  | 'background_checks_monthly_25'
  | 'pentest_monthly_1'
  | 'pentest_monthly_3'
  | 'pentest_monthly_4'
  | 'pentest_monthly_5'
  | 'pentest_monthly_5_current'
  | 'pentest_monthly_10';

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
  trialDays?: number;
  deprecated?: boolean;
};

export const subscriptionBillingSkuKeys = [
  'background_checks_monthly_3',
  'background_checks_monthly_10',
  'background_checks_monthly_20',
  'pentest_monthly_1',
  'pentest_monthly_3',
  'pentest_monthly_5_current',
] as const satisfies readonly BillingSkuKey[];

export type SubscriptionBillingSkuKey = (typeof subscriptionBillingSkuKeys)[number];

export type BillingCatalog = {
  environment: BillingCatalogEnvironment;
  products: Record<BillingProductKey, string>;
  prices: Record<BillingSkuKey, string>;
  skus: Record<BillingSkuKey, BillingSku>;
};

const legacyTestProducts = {
  backgroundCheck: 'prod_UQNNIS1di6uOLB',
  pentest: 'prod_UQqGJryNvXajUt',
};

const legacyLiveProducts = {
  backgroundCheck: 'prod_UQNH0N7tplDVIy',
  pentest: 'prod_UQqFwiuxcFTZ0G',
};

const testProducts = {
  backgroundCheck: 'prod_UQvQYmEniNCyvI',
  pentest: 'prod_UQvQW6Pbh1HrEw',
};

const liveProducts = {
  backgroundCheck: 'prod_UQvQRREj9JaIh1',
  pentest: 'prod_UQvQVLDFiaWxNf',
};

const testSkus = createSkus({
  products: testProducts,
  legacyProducts: legacyTestProducts,
  prices: {
    background_check_one_time: 'price_1TRWckCkFWhKYvHIA1GLv1sO',
    background_checks_monthly_3: 'price_1TS3zjCkFWhKYvHIkramHVwe',
    background_checks_monthly_10: 'price_1TS3zjCkFWhKYvHIRylPAQeI',
    background_checks_monthly_20: 'price_1TS3zjCkFWhKYvHIU5jMCCWs',
    background_checks_monthly_25: 'price_1TRya7CkFWhKYvHIDbCWSITp',
    pentest_monthly_1: 'price_1TS3ziCkFWhKYvHI0H5TWxNI',
    pentest_monthly_3: 'price_1TS3ziCkFWhKYvHI1nbXC7UU',
    pentest_monthly_4: 'price_1TS3ZsCkFWhKYvHIgAogX3Po',
    pentest_monthly_5_current: 'price_1TS3zjCkFWhKYvHISBHjtZXB',
    pentest_monthly_10: 'price_1TS3ZsCkFWhKYvHI8gLvPL1t',
    pentest_monthly_5: 'price_1TRya6CkFWhKYvHI1sJ2M2no',
  },
});

const liveSkus = createSkus({
  products: liveProducts,
  legacyProducts: legacyLiveProducts,
  prices: {
    background_check_one_time: 'price_1TRWWzCxqPDT5y0W2cjTNfIq',
    background_checks_monthly_3: 'price_1TS3zTCxqPDT5y0WaDAtQ6EW',
    background_checks_monthly_10: 'price_1TS3zUCxqPDT5y0Whecvdmjl',
    background_checks_monthly_20: 'price_1TS3zVCxqPDT5y0WCsB6ywMP',
    background_checks_monthly_25: 'price_legacy_background_checks_monthly_25',
    pentest_monthly_1: 'price_1TS3zKCxqPDT5y0WsZnBU8NT',
    pentest_monthly_3: 'price_1TS3zMCxqPDT5y0WC2OyJNAv',
    pentest_monthly_4: 'price_1TS3ZcCxqPDT5y0WRHbHXuFd',
    pentest_monthly_5_current: 'price_1TS3zNCxqPDT5y0WYC5mLjwA',
    pentest_monthly_10: 'price_1TS3ZdCxqPDT5y0WKsHTKiTY',
    pentest_monthly_5: 'price_legacy_pentest_monthly_5',
  },
});

export const billingCatalogs = {
  test: createCatalog({ environment: 'test', skus: testSkus }),
  live: createCatalog({ environment: 'live', skus: liveSkus }),
} satisfies Record<BillingCatalogEnvironment, BillingCatalog>;

export function resolveBillingCatalogEnvironment(params?: {
  stripeSecretKey?: string | null;
  nodeEnv?: string | null;
}): BillingCatalogEnvironment {
  const stripeSecretKey = params?.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY;
  if (stripeSecretKey?.startsWith('sk_live_')) return 'live';
  if (stripeSecretKey?.startsWith('sk_test_')) return 'test';
  return (params?.nodeEnv ?? process.env.NODE_ENV) === 'production' ? 'live' : 'test';
}

export function getBillingCatalog(environment: BillingCatalogEnvironment = 'test'): BillingCatalog {
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
  const catalogs = params.environment
    ? [getBillingCatalog(params.environment)]
    : Object.values(billingCatalogs);
  for (const catalog of catalogs) {
    const sku = Object.values(catalog.skus).find(
      (item) => item.stripePriceId === params.stripePriceId,
    );
    if (sku) return sku;
  }
  return null;
}

export function getBillingSkuProductKey(skuKey: string): BillingProductKey | null {
  for (const catalog of Object.values(billingCatalogs)) {
    const sku = catalog.skus[skuKey as BillingSkuKey];
    if (sku) return sku.productKey;
  }
  return null;
}

export function getBillingSkuKeysForProduct(productKey: BillingProductKey): BillingSkuKey[] {
  return Object.values(billingCatalogs.test.skus)
    .filter((sku) => sku.productKey === productKey)
    .map((sku) => sku.key);
}

export function getSubscriptionBillingSkuKeysForProduct(
  productKey: BillingProductKey,
): SubscriptionBillingSkuKey[] {
  return subscriptionBillingSkuKeys.filter(
    (skuKey) => billingCatalogs.test.skus[skuKey].productKey === productKey,
  );
}

export function isSubscriptionBillingSkuKey(value: string): value is SubscriptionBillingSkuKey {
  return subscriptionBillingSkuKeys.some((skuKey) => skuKey === value);
}

function createCatalog(params: {
  environment: BillingCatalogEnvironment;
  skus: Record<BillingSkuKey, BillingSku>;
}): BillingCatalog {
  return {
    environment: params.environment,
    products: {
      background_check: params.skus.background_checks_monthly_3.stripeProductId,
      pentest: params.skus.pentest_monthly_1.stripeProductId,
    },
    prices: Object.fromEntries(
      Object.values(params.skus).map((sku) => [sku.key, sku.stripePriceId]),
    ) as Record<BillingSkuKey, string>,
    skus: params.skus,
  };
}
