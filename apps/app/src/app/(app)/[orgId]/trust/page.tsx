import PageCore from '@/components/pages/PageCore.tsx';
import type { Metadata } from 'next';
import { TrustAccessRequestsClient } from './components/TrustAccessRequestsClient';

export default function TrustAccessPage() {
  return (
    <PageCore>
      <TrustAccessRequestsClient />
    </PageCore>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Trust Access Requests',
  };
}
