import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BillingAddOnPlansClient } from './BillingAddOnPlansClient';
import { BillingSettingsClient } from './BillingSettingsClient';
import { getBillingAddOn } from './billingAddOns';
import { emptyBillingStatus } from './emptyBillingStatus';
import type { BackgroundCheckBillingStatus } from './types';

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams?: Promise<{ addOn?: string }>;
}) {
  const { orgId } = await params;
  const addOnSlug = (await searchParams)?.addOn;
  const response = await serverApi.get<BackgroundCheckBillingStatus>('/v1/billing/status');
  const initialBillingStatus = response.data ?? emptyBillingStatus;

  if (addOnSlug) {
    const addOn = getBillingAddOn(addOnSlug);
    if (!addOn) notFound();

    return (
      <BillingAddOnPlansClient
        organizationId={orgId}
        addOn={addOn}
        initialBillingStatus={initialBillingStatus}
      />
    );
  }

  return (
    <BillingSettingsClient organizationId={orgId} initialBillingStatus={initialBillingStatus} />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Billing',
  };
}
