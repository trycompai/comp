'use client';

import { Badge, Button, Stack, Text } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import { billingAddOns } from './billingAddOns';
import type { BackgroundCheckBillingStatus } from './types';

interface BillingAddOnsOverviewProps {
  organizationId: string;
  subscriptions: NonNullable<BackgroundCheckBillingStatus['subscriptions']>;
}

export function BillingAddOnsOverview({
  organizationId,
  subscriptions,
}: BillingAddOnsOverviewProps) {
  const router = useRouter();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {billingAddOns.map((addOn) => {
        const skuKeys: readonly string[] = addOn.skuKeys;
        const activeSubscription = subscriptions.find(
          (subscription) =>
            skuKeys.includes(subscription.skuKey) &&
            (subscription.status === 'active' || subscription.status === 'trialing'),
        );

        return (
          <div key={addOn.slug} className="rounded-lg border bg-card p-5">
            <Stack gap="4">
              <Stack gap="2">
                <div className="flex flex-wrap items-center gap-2">
                  <Text weight="medium">{addOn.name}</Text>
                  {activeSubscription && <Badge variant="default">Active</Badge>}
                </div>
                <Text size="sm" variant="muted" leading="relaxed">
                  {addOn.description}
                </Text>
              </Stack>

              <Stack gap="1">
                <Text size="sm" weight="medium">
                  {addOn.summary}
                </Text>
                {activeSubscription && (
                  <Text size="sm" variant="muted">
                    {activeSubscription.usedQuantity} of {activeSubscription.includedQuantity} used
                    this period.
                  </Text>
                )}
              </Stack>

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
                  View plans
                </Button>
              </div>
            </Stack>
          </div>
        );
      })}
    </div>
  );
}
