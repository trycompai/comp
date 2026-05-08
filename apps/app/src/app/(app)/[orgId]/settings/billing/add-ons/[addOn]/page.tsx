import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BillingAddOnPlansClient } from '../../BillingAddOnPlansClient';
import { emptyBillingStatus } from '../../emptyBillingStatus';
import { getBillingAddOn } from '../../billingAddOns';
import type { BackgroundCheckBillingStatus } from '../../types';

export default async function BillingAddOnPage({
  params,
}: {
  params: Promise<{ orgId: string; addOn: string }>;
}) {
  const { orgId, addOn: addOnSlug } = await params;
  const addOn = getBillingAddOn(addOnSlug);
  if (!addOn) notFound();

  const response = await serverApi.get<BackgroundCheckBillingStatus>('/v1/billing/status');

  return (
    <BillingAddOnPlansClient
      organizationId={orgId}
      addOn={addOn}
      initialBillingStatus={response.data ?? emptyBillingStatus}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ addOn: string }>;
}): Promise<Metadata> {
  const { addOn: addOnSlug } = await params;
  const addOn = getBillingAddOn(addOnSlug);

  return {
    title: addOn ? `${addOn.detailTitle} Billing` : 'Billing Add-on',
  };
}
