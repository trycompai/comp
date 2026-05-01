import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BillingAddOnPlansClient } from '../BillingAddOnPlansClient';
import { getBillingAddOn } from '../billingAddOns';
import { emptyBillingStatus } from '../emptyBillingStatus';
import type { BackgroundCheckBillingStatus } from '../types';

function getAddOnSlug(addOnPath: string[]) {
  if (addOnPath.length !== 2 || addOnPath[0] !== 'add-ons') {
    return null;
  }
  return addOnPath[1];
}

export default async function BillingAddOnCatchAllPage({
  params,
}: {
  params: Promise<{ orgId: string; addOn: string[] }>;
}) {
  const { orgId, addOn: addOnPath } = await params;
  const addOnSlug = getAddOnSlug(addOnPath);
  if (!addOnSlug) notFound();

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
  params: Promise<{ addOn: string[] }>;
}): Promise<Metadata> {
  const { addOn: addOnPath } = await params;
  const addOnSlug = getAddOnSlug(addOnPath);
  const addOn = addOnSlug ? getBillingAddOn(addOnSlug) : null;

  return {
    title: addOn ? `${addOn.detailTitle} Billing` : 'Billing Add-on',
  };
}
