import { auth } from '@/utils/auth';
import { db } from '@db';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { TrustSettingsClient } from './components/TrustSettingsClient';

export default async function TrustSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [trustPortal, organization] = await Promise.all([
    getTrustPortal(orgId),
    getOrganization(orgId),
  ]);

  return (
    <PageLayout header={<PageHeader title="Trust Settings" />}>
      <TrustSettingsClient
        orgId={orgId}
        contactEmail={trustPortal?.contactEmail ?? null}
        primaryColor={organization?.primaryColor ?? null}
        domain={trustPortal?.domain ?? ''}
        domainVerified={trustPortal?.domainVerified ?? false}
        isVercelDomain={trustPortal?.isVercelDomain ?? false}
        vercelVerification={trustPortal?.vercelVerification ?? null}
        allowedDomains={trustPortal?.allowedDomains ?? []}
      />
    </PageLayout>
  );
}

const getTrustPortal = async (orgId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    return null;
  }

  const trustPortal = await db.trust.findUnique({
    where: {
      organizationId: orgId,
    },
  });

  return {
    contactEmail: trustPortal?.contactEmail ?? null,
    domain: trustPortal?.domain ?? '',
    domainVerified: trustPortal?.domainVerified ?? false,
    isVercelDomain: trustPortal?.isVercelDomain ?? false,
    vercelVerification: trustPortal?.vercelVerification ?? null,
    allowedDomains: trustPortal?.allowedDomains ?? [],
  };
};

const getOrganization = async (orgId: string) => {
  const organization = await db.organization.findUnique({
    where: { id: orgId },
    select: { primaryColor: true },
  });

  return organization;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Trust Settings',
  };
}
