import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { BillingSettingsClient } from './BillingSettingsClient';
import { emptyBillingStatus } from './emptyBillingStatus';
import type { BackgroundCheckBillingStatus } from './types';

export default async function BillingPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const response = await serverApi.get<BackgroundCheckBillingStatus>('/v1/billing/status');

  return (
    <BillingSettingsClient
      organizationId={orgId}
      initialBillingStatus={response.data ?? emptyBillingStatus}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Billing',
  };
}
