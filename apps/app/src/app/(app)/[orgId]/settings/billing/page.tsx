import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { BillingSettingsClient } from './BillingSettingsClient';
import type { BackgroundCheckBillingStatus } from './types';

const emptyBillingStatus: BackgroundCheckBillingStatus = {
  hasPaymentMethod: false,
  setupAt: null,
  usage: {
    backgroundChecks: 0,
    penetrationTests: 0,
  },
  invoices: [],
};

export default async function BillingPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const response = await serverApi.get<BackgroundCheckBillingStatus>(
    '/v1/background-check-billing/status',
  );

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
