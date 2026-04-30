'use client';

import { getBillingSku, type BillingSkuKey } from '@trycompai/billing';
import { Button, Stack, Text } from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import type { BackgroundCheckBillingStatus } from './types';

interface BillingSubscriptionPlansProps {
  skuKeys?: readonly BillingSkuKey[];
  subscriptions: NonNullable<BackgroundCheckBillingStatus['subscriptions']>;
  disabled: boolean;
  loadingSkuKey: string | null;
  onSubscribe: (skuKey: BillingSkuKey) => void;
}

const planSkuKeys = [
  'pentest_monthly_5',
  'background_checks_monthly_25',
] as const satisfies readonly BillingSkuKey[];

export function BillingSubscriptionPlans({
  skuKeys = planSkuKeys,
  subscriptions,
  disabled,
  loadingSkuKey,
  onSubscribe,
}: BillingSubscriptionPlansProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {skuKeys.map((skuKey) => {
        const sku = getBillingSku({ skuKey });
        const subscription = subscriptions.find((item) => item.skuKey === skuKey);
        const active = subscription?.status === 'active' || subscription?.status === 'trialing';
        const included = sku.includedUsage;

        return (
          <div key={sku.key} className="rounded-lg border bg-card p-5">
            <Stack gap="4">
              <Stack gap="1">
                <Text weight="medium">{sku.name}</Text>
                <Text size="sm" variant="muted">
                  {sku.description}
                </Text>
              </Stack>
              <Stack gap="1">
                <Text size="lg" weight="semibold">
                  {formatAmount(sku.unitAmount)}
                  <span className="text-sm font-normal text-muted-foreground"> / month</span>
                </Text>
                {included && (
                  <Text size="sm" variant="muted">
                    {included.quantity} {formatUsageUnit(included.unit)} included monthly
                  </Text>
                )}
              </Stack>
              {active && subscription ? (
                <Stack gap="2">
                  <Text size="sm" variant="muted">
                    {subscription.usedQuantity} of {subscription.includedQuantity} used this
                    period.
                  </Text>
                  <Button type="button" variant="secondary" disabled>
                    Active subscription
                  </Button>
                </Stack>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  aria-label={`Subscribe to ${sku.name}`}
                  disabled={disabled || loadingSkuKey !== null}
                  loading={loadingSkuKey === skuKey}
                  iconRight={<Launch size={16} />}
                  onClick={() => onSubscribe(skuKey)}
                >
                  Subscribe
                </Button>
              )}
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

function formatUsageUnit(unit: string) {
  return unit === 'scan' ? 'scans' : 'background checks';
}
