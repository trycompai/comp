import PageCore from '@/components/pages/PageCore.tsx';
import type { Metadata } from 'next';
import { TrustAccessRequestsClient } from './components/trust-access-request-client';

export default async function TrustAccessPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  return (
    <PageCore>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Access & Grants</h1>
          <p className="text-muted-foreground">Manage data access requests and grants</p>
        </div>
        <TrustAccessRequestsClient orgId={orgId} />
      </div>
    </PageCore>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Access & Grants',
  };
}
