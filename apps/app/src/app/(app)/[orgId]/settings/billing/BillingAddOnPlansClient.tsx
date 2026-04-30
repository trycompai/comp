'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import type { BillingSkuKey } from '@trycompai/billing';
import {
  PageHeader,
  PageHeaderDescription,
  PageLayout,
  Section,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { BillingSubscriptionPlans } from './BillingSubscriptionPlans';
import type { BillingAddOn } from './billingAddOns';
import type { BackgroundCheckBillingStatus } from './types';

interface BillingAddOnPlansClientProps {
  organizationId: string;
  addOn: BillingAddOn;
  initialBillingStatus: BackgroundCheckBillingStatus;
}

export function BillingAddOnPlansClient({
  organizationId,
  addOn,
  initialBillingStatus,
}: BillingAddOnPlansClientProps) {
  const [loadingSubscriptionSku, setLoadingSubscriptionSku] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const canManageBilling = hasPermission('organization', 'update');

  const { data: billingStatus } = useSWR<BackgroundCheckBillingStatus>(
    ['/v1/billing/status', organizationId],
    async ([endpoint]) => {
      const response = await apiClient.get<BackgroundCheckBillingStatus>(endpoint, organizationId);
      if (response.error || !response.data) {
        throw new Error('Failed to load billing status');
      }
      return response.data;
    },
    {
      fallbackData: initialBillingStatus,
      revalidateOnMount: false,
    },
  );

  const subscriptions = useMemo(
    () => billingStatus?.subscriptions ?? initialBillingStatus.subscriptions ?? [],
    [billingStatus?.subscriptions, initialBillingStatus.subscriptions],
  );

  const handleOpenSubscription = async (skuKey: BillingSkuKey) => {
    setLoadingSubscriptionSku(skuKey);

    const returnUrl = `${window.location.origin}/${organizationId}/settings/billing/add-ons/${addOn.slug}`;
    const response = await apiClient.post<{ url: string }>(
      '/v1/billing/subscription-session',
      {
        skuKey,
        successUrl: `${returnUrl}?billing_subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: returnUrl,
      },
      organizationId,
    );

    if (response.data?.url) {
      window.location.href = response.data.url;
      return;
    }

    toast.error('Failed to open checkout');
    setLoadingSubscriptionSku(null);
  };

  return (
    <Tabs defaultValue="overview">
      <PageLayout
        header={
          <PageHeader
            title={addOn.detailTitle}
            breadcrumbs={[
              {
                label: 'Add-ons',
                href: `/${organizationId}/settings/billing`,
              },
              {
                label: addOn.detailTitle,
                isCurrent: true,
              },
            ]}
            tabs={
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
              </TabsList>
            }
          >
            <PageHeaderDescription>{addOn.description}</PageHeaderDescription>
          </PageHeader>
        }
      >
        <TabsContent value="overview">
          <Section
            title="Subscription plans"
            description="Choose a monthly plan for this add-on."
          >
            <BillingSubscriptionPlans
              skuKeys={addOn.skuKeys}
              subscriptions={subscriptions}
              disabled={!canManageBilling}
              loadingSkuKey={loadingSubscriptionSku}
              onSubscribe={handleOpenSubscription}
            />
          </Section>
        </TabsContent>
      </PageLayout>
    </Tabs>
  );
}
