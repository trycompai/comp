import type { BillingSkuKey as CatalogBillingSkuKey } from '@trycompai/billing';

export type BillingSkuKey = CatalogBillingSkuKey;

export type BillingAddOnSlug = 'penetration-tests' | 'background-checks';

export interface BillingAddOn {
  slug: BillingAddOnSlug;
  name: string;
  detailTitle: string;
  description: string;
  summary: string;
  skuKeys: readonly BillingSkuKey[];
}

export const billingAddOns = [
  {
    slug: 'penetration-tests',
    name: 'Penetration Tests',
    detailTitle: 'Penetration Test',
    description: 'Run security scans with monthly included usage and centralized billing.',
    summary: 'Plans from $399/mo',
    skuKeys: ['pentest_monthly_5'],
  },
  {
    slug: 'background-checks',
    name: 'Background Checks',
    detailTitle: 'Background Checks',
    description: 'Verify employees with subscription allowances or one-off checks as needed.',
    summary: 'Plans from $249/mo',
    skuKeys: ['background_checks_monthly_25'],
  },
] as const satisfies readonly BillingAddOn[];

export function getBillingAddOn(slug: string) {
  return billingAddOns.find((addOn) => addOn.slug === slug) ?? null;
}
