import { serverApi } from '@/lib/api-server';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { TrustSettingsClient } from './components/TrustSettingsClient';

interface TrustPortalSettings {
  contactEmail: string | null;
  domain: string;
  domainVerified: boolean;
  isVercelDomain: boolean;
  vercelVerification: string | null;
  allowedDomains: string[];
}

export default async function TrustSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const settingsRes = await serverApi.get<TrustPortalSettings>(
    '/v1/trust-portal/settings',
  );

  const trustPortal = settingsRes.data;

  return (
    <PageLayout header={<PageHeader title="Trust Settings" />}>
      <TrustSettingsClient
        orgId={orgId}
        contactEmail={trustPortal?.contactEmail ?? null}
        domain={trustPortal?.domain ?? ''}
        domainVerified={trustPortal?.domainVerified ?? false}
        isVercelDomain={trustPortal?.isVercelDomain ?? false}
        vercelVerification={trustPortal?.vercelVerification ?? null}
        allowedDomains={trustPortal?.allowedDomains ?? []}
      />
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Trust Settings',
  };
}
