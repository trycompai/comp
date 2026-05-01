'use client';

import { getBillingSku, getBillingSkuProductKey, type BillingSkuKey } from '@trycompai/billing';
import { Badge, Button, Stack, Text } from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import type { BackgroundCheckBillingStatus } from './types';

interface BillingSubscriptionPlansProps {
  skuKeys?: readonly BillingSkuKey[];
  subscriptions: NonNullable<BackgroundCheckBillingStatus['subscriptions']>;
  trialEligibility: {
    pentest: boolean;
    background_check: boolean;
  };
  disabled: boolean;
  loadingSkuKey: string | null;
  onSubscribe: (skuKey: BillingSkuKey) => void;
}

const planSkuKeys = [
  'pentest_monthly_1',
  'pentest_monthly_3',
  'pentest_monthly_5_current',
  'background_checks_monthly_3',
  'background_checks_monthly_10',
  'background_checks_monthly_20',
] as const satisfies readonly BillingSkuKey[];

export function BillingSubscriptionPlans({
  skuKeys = planSkuKeys,
  subscriptions,
  trialEligibility,
  disabled,
  loadingSkuKey,
  onSubscribe,
}: BillingSubscriptionPlansProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {skuKeys.map((skuKey) => {
        const sku = getBillingSku({ skuKey });
        const subscription = subscriptions.find(
          (item) => getBillingSkuProductKey(item.skuKey) === sku.productKey,
        );
        const active = subscription?.status === 'active' || subscription?.status === 'trialing';
        const current = active && subscription?.skuKey === skuKey;
        const included = sku.includedUsage;
        const remaining = subscription
          ? Math.max(subscription.includedQuantity - subscription.usedQuantity, 0)
          : null;
        const unit = included ? formatUsageUnit(included.unit, included.quantity) : 'credits';
        const cta = getPlanCta({
          active,
          productKey: sku.productKey,
          quantity: included?.quantity ?? 0,
        });
        const trialEligible =
          !active && typeof sku.trialDays === 'number' && trialEligibility[sku.productKey];
        const buttonLabel = trialEligible ? 'Start free trial' : cta;

        return (
          <div
            key={sku.key}
            className={`flex min-h-[360px] flex-col rounded-lg border bg-card p-5 ${
              current ? 'border-primary shadow-sm' : ''
            }`}
          >
            <div className="flex h-full flex-col gap-4">
              <Stack gap="2">
                <div className="flex items-center justify-between gap-3">
                  <Text weight="medium">{sku.name}</Text>
                  {current && <Badge variant="default">Current</Badge>}
                  {trialEligible && <Badge variant="default">14-day free trial</Badge>}
                </div>
                <div className="min-h-[56px]">
                  <Text size="sm" variant="muted">
                    {sku.description}
                  </Text>
                </div>
              </Stack>
              <div className="min-h-[72px]">
                <Text size="lg" weight="semibold">
                  {formatAmount(sku.unitAmount)}
                  <span className="text-sm font-normal text-muted-foreground"> / mo</span>
                </Text>
                {included && (
                  <Text size="sm" variant="muted">
                    {included.quantity} {unit} every month
                  </Text>
                )}
              </div>
              <div className="flex min-h-[64px] items-center rounded-md bg-muted/30 px-3 py-2">
                <Text size="sm" weight="medium">
                  {trialEligible
                    ? 'Try it free for 14 days. Add a card now, pay only if you keep it.'
                    : getPlanPromise(sku.productKey, included?.quantity ?? 0)}
                </Text>
              </div>
              {current && subscription ? (
                <div className="mt-auto flex flex-col gap-2">
                  <Text size="sm" variant="muted">
                    {remaining} of {subscription.includedQuantity} {unit}
                    remaining this period.
                  </Text>
                  <Button type="button" variant="secondary" width="full" disabled>
                    Current plan
                  </Button>
                </div>
              ) : (
                <div className="mt-auto">
                  <Button
                    type="button"
                    variant="default"
                    width="full"
                    aria-label={`${buttonLabel} with ${sku.name}`}
                    disabled={disabled || loadingSkuKey !== null}
                    loading={loadingSkuKey === skuKey}
                    iconRight={<Launch size={16} />}
                    onClick={() => onSubscribe(skuKey)}
                  >
                    {buttonLabel}
                  </Button>
                </div>
              )}
            </div>
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

function formatUsageUnit(unit: string, quantity: number) {
  if (unit === 'scan') return quantity === 1 ? 'scan' : 'scans';
  return quantity === 1 ? 'background check' : 'background checks';
}

function getPlanPromise(productKey: string, quantity: number) {
  if (productKey === 'pentest') {
    if (quantity === 1) return 'Validate critical surfaces every month.';
    if (quantity === 3) return 'Launch and retest fixes with confidence.';
    return 'Keep key surfaces audit-ready.';
  }
  if (quantity === 3) return 'Cover new hires without approval delays.';
  if (quantity === 10) return 'Keep recruiting moving predictably.';
  return 'Scale screening without surprise spend.';
}

function getPlanCta({
  active,
  productKey,
  quantity,
}: {
  active: boolean;
  productKey: string;
  quantity: number;
}) {
  const action = active ? 'Switch to' : 'Start';
  if (productKey === 'pentest') {
    if (quantity === 1) return `${action} monthly scans`;
    if (quantity === 3) return `${action} release coverage`;
    return `${action} continuous coverage`;
  }
  if (quantity === 3) return `${action} hiring checks`;
  if (quantity === 10) return `${action} recruiting coverage`;
  return `${action} hiring at scale`;
}
