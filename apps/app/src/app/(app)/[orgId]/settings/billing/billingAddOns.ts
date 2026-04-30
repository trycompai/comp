import type { BillingSkuKey as CatalogBillingSkuKey } from '@trycompai/billing';

export type BillingSkuKey = CatalogBillingSkuKey;

export type BillingAddOnSlug = 'penetration-tests' | 'background-checks';

export interface BillingAddOn {
  slug: BillingAddOnSlug;
  name: string;
  detailTitle: string;
  description: string;
  summary: string;
  proof: string;
  planTitle: string;
  planDescription: string;
  ctaLabel: string;
  skuKeys: readonly BillingSkuKey[];
}

export const billingAddOns = [
  {
    slug: 'penetration-tests',
    name: 'Penetration Tests',
    detailTitle: 'Penetration Tests',
    description:
      'Catch exploitable issues before customers, auditors, or attackers do. Monthly scans ship with evidence your team can act on.',
    summary: 'Security proof from $299/mo',
    proof: 'Turn every release into an audit-ready security check.',
    planTitle: 'Choose your scan cadence',
    planDescription:
      'Start with one premium monthly scan, or cover releases, retests, and critical customer-facing surfaces with higher allowances.',
    ctaLabel: 'Compare scan plans',
    skuKeys: ['pentest_monthly_1', 'pentest_monthly_3', 'pentest_monthly_5_current'],
  },
  {
    slug: 'background-checks',
    name: 'Background Checks',
    detailTitle: 'Background Checks',
    description:
      'Keep hiring moving with compliant employee checks, predictable monthly credits, and no surprise per-check invoice dance.',
    summary: 'Hiring checks from $79/mo',
    proof: 'Verify new hires faster and keep every result tied to the employee record.',
    planTitle: 'Pick your hiring volume',
    planDescription:
      'Buy the monthly allowance that matches your hiring pace while keeping premium screening spend predictable.',
    ctaLabel: 'Compare check plans',
    skuKeys: [
      'background_checks_monthly_3',
      'background_checks_monthly_10',
      'background_checks_monthly_20',
    ],
  },
] as const satisfies readonly BillingAddOn[];

export function getBillingAddOn(slug: string) {
  return billingAddOns.find((addOn) => addOn.slug === slug) ?? null;
}
