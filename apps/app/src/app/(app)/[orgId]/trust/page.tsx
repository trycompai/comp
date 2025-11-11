import PageCore from '@/components/pages/PageCore.tsx';
import type { Metadata } from 'next';
import { TrustAccessRequestsClient } from './components/TrustAccessRequestsClient';

export default async function TrustAccessPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return (
    <PageCore>
      <TrustAccessRequestsClient orgId={orgId} />
    </PageCore>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Trust Access Requests',
  };
}
