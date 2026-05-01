'use client';

import { getBillingSku, getBillingSkuProductKey } from '@trycompai/billing';
import { Badge, Button, Stack, Text } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import { billingAddOns } from './billingAddOns';
import type { BackgroundCheckBillingStatus } from './types';

interface BillingAddOnsOverviewProps {
  organizationId: string;
  subscriptions: NonNullable<BackgroundCheckBillingStatus['subscriptions']>;
  trialEligibility?: BackgroundCheckBillingStatus['trialEligibility'];
}

export function BillingAddOnsOverview({
  organizationId,
  subscriptions,
  trialEligibility,
}: BillingAddOnsOverviewProps) {
  const router = useRouter();

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {billingAddOns.map((addOn) => {
        const productKey = getBillingSku({ skuKey: addOn.skuKeys[0] }).productKey;
        const activeSubscription = subscriptions.find(
          (subscription) =>
            getBillingSkuProductKey(subscription.skuKey) === productKey &&
            (subscription.status === 'active' || subscription.status === 'trialing'),
        );
        const trialEligible = !activeSubscription && trialEligibility?.[productKey] === true;
        const remaining = activeSubscription
          ? Math.max(activeSubscription.includedQuantity - activeSubscription.usedQuantity, 0)
          : null;

        return (
          <div
            key={addOn.slug}
            className="group relative overflow-hidden rounded-lg border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-primary/80 opacity-0 transition-opacity group-hover:opacity-100" />
            <Stack gap="6">
              <Stack gap="3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Text weight="medium">{addOn.name}</Text>
                    <Text size="xs" variant="muted">
                      {addOn.summary}
                    </Text>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {trialEligible && <Badge variant="default">14-day free trial</Badge>}
                    {activeSubscription && <Badge variant="default">Active</Badge>}
                  </div>
                </div>
                <Text size="sm" variant="muted" leading="relaxed">
                  {addOn.description}
                </Text>
                <Text size="sm" weight="medium">
                  {trialEligible
                    ? 'Start with a 14-day free trial on the first tier. Card required, no charge today.'
                    : addOn.proof}
                </Text>
              </Stack>

              <div className="grid gap-2 sm:grid-cols-3">
                {addOn.skuKeys.map((skuKey) => {
                  const sku = getBillingSku({ skuKey });
                  return (
                    <div
                      key={skuKey}
                      className="rounded-md border bg-background p-3 shadow-sm transition-colors group-hover:border-primary/25"
                    >
                      <div className="flex items-baseline gap-1">
                        <Text size="lg" weight="semibold">
                          {formatAmount(sku.unitAmount)}
                        </Text>
                        <Text size="xs" variant="muted">
                          /mo
                        </Text>
                      </div>
                      <Text size="xs" variant="muted">
                        {sku.includedUsage?.quantity}{' '}
                        {formatUnit({
                          unit: sku.includedUsage?.unit,
                          quantity: sku.includedUsage?.quantity,
                        })}
                      </Text>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-md bg-muted/30 px-3 py-2">
                <Text size="sm" variant={remaining === null ? 'muted' : undefined}>
                  {remaining === null
                    ? 'No active subscription yet.'
                    : `${remaining} of ${activeSubscription?.includedQuantity ?? 0} ${formatUnit({
                        unit:
                          activeSubscription &&
                          getBillingSkuProductKey(activeSubscription.skuKey) === 'pentest'
                            ? 'scan'
                            : 'background_check',
                        quantity: activeSubscription?.includedQuantity,
                      })} remaining this period.`}
                </Text>
              </div>

              <div>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`View ${addOn.name} plans`}
                  iconRight={<ArrowRight size={16} />}
                  onClick={() =>
                    router.push(`/${organizationId}/settings/billing/add-ons/${addOn.slug}`)
                  }
                >
                  {addOn.ctaLabel}
                </Button>
              </div>
            </Stack>
          </div>
        );
      })}
    </div>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatUnit(params: { unit?: string; quantity?: number }) {
  if (params.unit === 'scan') return params.quantity === 1 ? 'scan' : 'scans';
  return params.quantity === 1 ? 'check' : 'checks';
}
