'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import {
  PageHeader,
  PageLayout,
  Section,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { BillingAddOnsOverview } from './BillingAddOnsOverview';
import { BillingInvoicesTable } from './BillingInvoicesTable';
import { BillingPaymentMethodCard } from './BillingPaymentMethodCard';
import { BillingPreferencesForm } from './BillingPreferencesForm';
import { BillingUsageTable } from './BillingUsageTable';
import type { BackgroundCheckBillingStatus } from './types';

interface BillingSettingsClientProps {
  organizationId: string;
  initialBillingStatus: BackgroundCheckBillingStatus;
}

const defaultUsage = {
  backgroundChecks: 0,
  penetrationTests: 0,
};

export function BillingSettingsClient({
  organizationId,
  initialBillingStatus,
}: BillingSettingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledSessionId = useRef<string | null>(null);
  const [isOpeningBilling, setIsOpeningBilling] = useState(false);
  const { hasPermission } = usePermissions();
  const canManageBilling = hasPermission('organization', 'update');

  const { data: billingStatus, mutate: mutateBillingStatus } = useSWR<BackgroundCheckBillingStatus>(
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

  const hasPaymentMethod = billingStatus?.hasPaymentMethod === true;
  const usage = billingStatus?.usage ?? initialBillingStatus.usage ?? defaultUsage;
  const invoices = useMemo(
    () => billingStatus?.invoices ?? initialBillingStatus.invoices ?? [],
    [billingStatus?.invoices, initialBillingStatus.invoices],
  );
  const usageRows = useMemo(
    () => billingStatus?.usageRows ?? initialBillingStatus.usageRows ?? [],
    [billingStatus?.usageRows, initialBillingStatus.usageRows],
  );
  const subscriptions = useMemo(
    () => billingStatus?.subscriptions ?? initialBillingStatus.subscriptions ?? [],
    [billingStatus?.subscriptions, initialBillingStatus.subscriptions],
  );
  const trialEligibility = billingStatus?.trialEligibility ??
    initialBillingStatus.trialEligibility ?? {
      pentest: false,
      background_check: false,
    };
  const preferences = useMemo(
    () => billingStatus?.preferences ?? initialBillingStatus.preferences ?? null,
    [billingStatus?.preferences, initialBillingStatus.preferences],
  );
  const statusLabel = hasPaymentMethod ? 'Billing set up' : 'Payment method needed';

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const setupSucceeded = searchParams.get('background_check_billing') === 'success';
    if (!sessionId || !setupSucceeded || handledSessionId.current === sessionId) return;

    handledSessionId.current = sessionId;
    void (async () => {
      const setupResponse = await apiClient.post<{ success: true }>(
        '/v1/billing/setup-success',
        { sessionId },
        organizationId,
      );

      if (setupResponse.error) {
        toast.error('Failed to save billing details');
        router.replace(pathname, { scroll: false });
        return;
      }

      toast.success('Billing details saved');
      await mutateBillingStatus(
        {
          hasPaymentMethod: true,
          setupAt: new Date().toISOString(),
          usage,
          invoices,
          preferences,
          usageRows,
          subscriptions,
        },
        { revalidate: true },
      );
      router.replace(pathname, { scroll: false });
    })();
  }, [
    invoices,
    mutateBillingStatus,
    organizationId,
    pathname,
    router,
    searchParams,
    subscriptions,
    usage,
    preferences,
    usageRows,
  ]);

  const handleOpenBilling = async () => {
    setIsOpeningBilling(true);

    const returnUrl = `${window.location.origin}/${organizationId}/settings/billing`;
    const endpoint = hasPaymentMethod ? '/v1/billing/portal' : '/v1/billing/setup-session';
    const body = hasPaymentMethod
      ? { returnUrl }
      : {
          successUrl: `${returnUrl}?background_check_billing=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: returnUrl,
        };
    const response = await apiClient.post<{ url: string }>(endpoint, body, organizationId);

    if (response.data?.url) {
      window.location.href = response.data.url;
      return;
    }

    toast.error('Failed to open billing portal');
    setIsOpeningBilling(false);
  };

  return (
    <Tabs defaultValue="add-ons">
      <PageLayout
        header={
          <PageHeader
            title="Billing"
            tabs={
              <TabsList>
                <TabsTrigger value="add-ons">Add-ons</TabsTrigger>
                <TabsTrigger value="usage">Usage</TabsTrigger>
                <TabsTrigger value="billing-details">Billing Details</TabsTrigger>
              </TabsList>
            }
          />
        }
      >
        <TabsContent value="add-ons">
          <Section
            title="Add-ons"
            description="Add the monthly credits that keep security reviews and hiring checks moving without surprise spend."
          >
            <BillingAddOnsOverview
              organizationId={organizationId}
              subscriptions={subscriptions}
              trialEligibility={trialEligibility}
            />
          </Section>
        </TabsContent>

        <TabsContent value="usage">
          <Section
            title="Usage"
            description="Review monthly allowance and paid service run history."
          >
            <BillingUsageTable subscriptions={subscriptions} usageRows={usageRows} />
          </Section>
        </TabsContent>

        <TabsContent value="billing-details">
          <Stack gap="8">
            <Section
              title="Payment method"
              description="Manage the card used for invoices and paid services."
            >
              <BillingPaymentMethodCard
                hasPaymentMethod={hasPaymentMethod}
                statusLabel={statusLabel}
                canManageBilling={canManageBilling}
                isOpeningBilling={isOpeningBilling}
                onOpenBilling={handleOpenBilling}
              />
            </Section>
            <Section
              title="Business details for invoicing"
              description="Set the legal, tax, and invoice contact details for this organization."
            >
              <BillingPreferencesForm
                organizationId={organizationId}
                preferences={preferences}
                disabled={!canManageBilling}
                onSaved={(status) => {
                  void mutateBillingStatus(status, { revalidate: false });
                }}
              />
            </Section>
            <BillingInvoicesTable invoices={invoices} />
          </Stack>
        </TabsContent>
      </PageLayout>
    </Tabs>
  );
}
