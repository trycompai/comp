'use client';

import { api } from '@/lib/api-client';
import { Badge, Button, Section, Stack, Text } from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import {
  BillingPreferencesAdminForm,
  CreditGrantForm,
  PlanChangeForm,
  type CreditFormValues,
  type PlanFormValues,
  type PreferenceFormValues,
} from './AdminBillingForms';
import { CreditBalanceRows, InvoiceRows, SubscriptionRows } from './AdminBillingTables';
import type {
  AdminBillingInvoice,
  AdminBillingStatus,
  AdminBillingSubscription,
} from './AdminBillingTypes';

const fetcher = async ([url, currentOrgId]: [string, string]) => {
  const response = await api.get<AdminBillingStatus>(url, currentOrgId);
  if (response.error || !response.data) {
    throw new Error(response.error ?? 'Failed to load billing');
  }
  return response.data;
};

export function AdminBillingTab({ orgId, currentOrgId }: { orgId: string; currentOrgId: string }) {
  const endpoint = `/v1/admin/organizations/${orgId}/billing`;
  const { data, error, isLoading, mutate } = useSWR<AdminBillingStatus>(
    [endpoint, currentOrgId],
    fetcher,
    { revalidateOnFocus: false },
  );
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (error) return <Text variant="muted">{error.message}</Text>;
  if (isLoading || !data) return <Text variant="muted">Loading billing...</Text>;

  const handleRefresh = () => mutate();

  const handlePlanSubmit = async (values: PlanFormValues) => {
    setLoadingAction('plan');
    const response = await api.post<AdminBillingStatus | { url: string }>(
      `${endpoint}/subscriptions`,
      {
        ...values,
        returnUrl: `${window.location.origin}/${currentOrgId}/admin/organizations/${orgId}`,
      },
      currentOrgId,
    );
    setLoadingAction(null);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    if (response.data && 'url' in response.data) {
      window.open(response.data.url, '_blank', 'noopener,noreferrer');
      toast.success('Checkout link opened');
      return;
    }
    toast.success('Subscription updated');
    await mutate(response.data, { revalidate: true });
  };

  const handleCreditSubmit = async (values: CreditFormValues) => {
    setLoadingAction('credits');
    const response = await api.post<AdminBillingStatus>(
      `${endpoint}/credits`,
      values,
      currentOrgId,
    );
    setLoadingAction(null);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success('Credits granted');
    await mutate(response.data, { revalidate: false });
  };

  const handlePreferencesSubmit = async (values: PreferenceFormValues) => {
    setLoadingAction('preferences');
    const response = await api.put<AdminBillingStatus>(
      `${endpoint}/preferences`,
      values,
      currentOrgId,
    );
    setLoadingAction(null);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success('Billing details updated');
    await mutate(response.data, { revalidate: false });
  };

  const handleCancel = async (subscription: AdminBillingSubscription, immediate: boolean) => {
    const note = window.prompt('Reason for cancellation');
    if (!note) return;
    const confirm = immediate ? window.prompt('Type "cancel now"') : undefined;
    setLoadingAction(subscription.id);
    const response = await api.post<AdminBillingStatus>(
      `${endpoint}/subscriptions/${subscription.id}/cancel`,
      {
        mode: immediate ? 'immediate' : 'period_end',
        note,
        confirm,
      },
      currentOrgId,
    );
    setLoadingAction(null);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success('Subscription cancellation updated');
    await mutate(response.data, { revalidate: false });
  };

  const handleResume = async (subscription: AdminBillingSubscription) => {
    const note = window.prompt('Reason for resuming subscription');
    if (!note) return;
    setLoadingAction(subscription.id);
    const response = await api.post<AdminBillingStatus>(
      `${endpoint}/subscriptions/${subscription.id}/resume`,
      { note },
      currentOrgId,
    );
    setLoadingAction(null);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success('Subscription resumed');
    await mutate(response.data, { revalidate: false });
  };

  const handleRetryLink = async (invoice: AdminBillingInvoice) => {
    setLoadingAction(invoice.id);
    const response = await api.post<{ hostedInvoiceUrl: string | null }>(
      `${endpoint}/invoices/${invoice.id}/retry-link`,
      { note: 'Customer success opened recovery link' },
      currentOrgId,
    );
    setLoadingAction(null);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    if (response.data?.hostedInvoiceUrl) {
      window.open(response.data.hostedInvoiceUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    toast.error('No hosted invoice link available');
  };

  return (
    <Stack gap="lg">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Stripe customer" value={data.stripeCustomerId ?? 'None'} />
        <SummaryCard label="Payment method" value={data.hasPaymentMethod ? 'Saved' : 'Missing'} />
        <SummaryCard label="Failed invoices" value={String(data.failedInvoices.length)} />
      </div>
      <Section
        title="Subscriptions"
        actions={
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        }
      >
        <Stack gap="4">
          <PlanChangeForm
            status={data}
            loading={loadingAction === 'plan'}
            onSubmit={handlePlanSubmit}
          />
          <SubscriptionRows
            subscriptions={data.subscriptions}
            onCancel={handleCancel}
            onResume={handleResume}
            loadingId={loadingAction}
          />
        </Stack>
      </Section>
      <Section title="Free credits">
        <Stack gap="4">
          <CreditBalanceRows balances={data.creditBalances} />
          <CreditGrantForm loading={loadingAction === 'credits'} onSubmit={handleCreditSubmit} />
        </Stack>
      </Section>
      <Section title="Billing details">
        <BillingPreferencesAdminForm
          status={data}
          loading={loadingAction === 'preferences'}
          onSubmit={handlePreferencesSubmit}
        />
      </Section>
      <Section title="Invoices and recovery">
        <InvoiceRows
          invoices={data.invoices}
          onRetryLink={handleRetryLink}
          loadingId={loadingAction}
        />
      </Section>
      <Section title="Audit history">
        <div className="grid gap-2">
          {data.auditEvents.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-lg border p-3">
              <Text size="sm">{event.eventType}</Text>
              <Badge variant="outline">{new Date(event.createdAt).toLocaleString()}</Badge>
            </div>
          ))}
          {data.auditEvents.length === 0 && <Text variant="muted">No billing audit events.</Text>}
        </div>
      </Section>
    </Stack>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <Text size="xs" variant="muted">
        {label}
      </Text>
      <div className="mt-2 break-all text-lg font-semibold">{value}</div>
    </div>
  );
}
