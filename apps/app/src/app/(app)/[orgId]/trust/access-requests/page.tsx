import { PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { TrustAccessRequestsClient } from '../components/trust-access-request-client';

export default async function AccessRequestsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <PageLayout header={<PageHeader title="Access Requests" />}>
      <TrustAccessRequestsClient orgId={orgId} />
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Access Requests',
  };
}
