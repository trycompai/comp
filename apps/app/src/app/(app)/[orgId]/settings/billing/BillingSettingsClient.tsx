'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import {
  Badge,
  Button,
  PageHeader,
  PageLayout,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { BillingInvoicesTable } from './BillingInvoicesTable';
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
    ['/v1/background-check-billing/status', organizationId],
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
  const statusLabel = hasPaymentMethod ? 'Billing set up' : 'Payment method needed';
  const actionLabel = hasPaymentMethod ? 'Update Billing Details' : 'Add payment method';

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const setupSucceeded = searchParams.get('background_check_billing') === 'success';
    if (!sessionId || !setupSucceeded || handledSessionId.current === sessionId) return;

    handledSessionId.current = sessionId;
    void (async () => {
      const setupResponse = await apiClient.post<{ success: true }>(
        '/v1/background-check-billing/setup-success',
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
        },
        { revalidate: true },
      );
      router.replace(pathname, { scroll: false });
    })();
  }, [invoices, mutateBillingStatus, organizationId, pathname, router, searchParams, usage]);

  const handleOpenBilling = async () => {
    setIsOpeningBilling(true);

    const returnUrl = `${window.location.origin}/${organizationId}/settings/billing`;
    const endpoint = hasPaymentMethod
      ? '/v1/background-check-billing/portal'
      : '/v1/background-check-billing/setup-session';
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

    toast.error('Failed to open Stripe billing');
    setIsOpeningBilling(false);
  };

  return (
    <PageLayout
      header={
        <PageHeader
          title="Billing"
          actions={
            <Button
              type="button"
              variant="default"
              loading={isOpeningBilling}
              disabled={!canManageBilling || isOpeningBilling}
              iconRight={<Launch size={16} />}
              onClick={handleOpenBilling}
            >
              {actionLabel}
            </Button>
          }
        />
      }
    >
      <Section
        title="Overview"
        description="Manage your payment method and review paid service activity."
      >
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="p-6">
            <Stack gap="4">
              <Stack gap="1">
                <Text weight="medium">Historical usage</Text>
                <Text size="sm" variant="muted">
                  Completed paid services for this organization.
                </Text>
              </Stack>
              <div className="grid gap-6 sm:grid-cols-2">
                <UsageMetric label="Penetration Tests" value={usage.penetrationTests} />
                <UsageMetric label="Background Checks" value={usage.backgroundChecks} />
              </div>
            </Stack>
          </div>
          <div className="border-t px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <Stack gap="1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Text weight="medium">Payment method</Text>
                    <Badge variant={hasPaymentMethod ? 'default' : 'outline'}>{statusLabel}</Badge>
                  </div>
                  <Text size="sm" variant="muted" leading="relaxed">
                    {hasPaymentMethod
                      ? 'A payment method is connected. Open the Stripe portal to update billing details, cards, and receipts.'
                      : 'Add a payment method to use paid services such as background checks and penetration testing.'}
                  </Text>
                </Stack>
              </div>
              <div className="flex flex-col gap-1 lg:items-end">
                <Text size="sm" variant="muted">
                  Managed securely in Stripe
                </Text>
                {!canManageBilling && (
                  <Text size="sm" variant="muted">
                    Ask an organization admin to update billing details.
                  </Text>
                )}
              </div>
            </div>
          </div>
        </div>
      </Section>
      <BillingInvoicesTable invoices={invoices} />
    </PageLayout>
  );
}

function UsageMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-44">
      <Stack gap="1">
        <Text size="sm" variant="muted">
          {label}
        </Text>
        <Text size="lg" weight="semibold" font="mono">
          {value.toLocaleString()}
        </Text>
      </Stack>
    </div>
  );
}
