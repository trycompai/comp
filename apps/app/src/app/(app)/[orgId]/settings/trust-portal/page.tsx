import { auth } from '@/utils/auth';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { cache } from 'react';
import { TrustPortalDomain } from './components/TrustPortalDomain';
import { TrustPortalSwitch } from './components/TrustPortalSwitch';

export default async function TrustPortalSettings({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const trustPortal = await getTrustPortal(orgId);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <TrustPortalSwitch
        enabled={trustPortal?.enabled ?? false}
        slug={trustPortal?.friendlyUrl ?? orgId}
        domain={trustPortal?.domain ?? ''}
        domainVerified={trustPortal?.domainVerified ?? false}
        contactEmail={trustPortal?.contactEmail ?? null}
        orgId={orgId}
        soc2={trustPortal?.soc2 ?? false}
        soc2typei={trustPortal?.soc2typei ?? false}
        soc2typeii={trustPortal?.soc2typeii ?? false}
        iso27001={trustPortal?.iso27001 ?? false}
        gdpr={trustPortal?.gdpr ?? false}
        hipaa={trustPortal?.hipaa ?? false}
        soc2Status={trustPortal?.soc2Status ?? 'started'}
        soc2typeiStatus={trustPortal?.soc2typeiStatus ?? 'started'}
        soc2typeiiStatus={trustPortal?.soc2typeiiStatus ?? 'started'}
        iso27001Status={trustPortal?.iso27001Status ?? 'started'}
        gdprStatus={trustPortal?.gdprStatus ?? 'started'}
        hipaaStatus={trustPortal?.hipaaStatus ?? 'started'}
        friendlyUrl={trustPortal?.friendlyUrl ?? null}
      />
      <TrustPortalDomain
        domain={trustPortal?.domain ?? ''}
        domainVerified={trustPortal?.domainVerified ?? false}
        orgId={orgId}
        isVercelDomain={trustPortal?.isVercelDomain ?? false}
        vercelVerification={trustPortal?.vercelVerification ?? null}
      />
    </div>
  );
}

const getTrustPortal = cache(async (orgId: string) => {
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
    enabled: trustPortal?.status === 'published',
    domain: trustPortal?.domain,
    domainVerified: trustPortal?.domainVerified,
    contactEmail: trustPortal?.contactEmail ?? '',
    soc2: trustPortal?.soc2,
    soc2typei: trustPortal?.soc2typei,
    soc2typeii: trustPortal?.soc2typeii,
    iso27001: trustPortal?.iso27001,
    gdpr: trustPortal?.gdpr,
    hipaa: trustPortal?.hipaa,
    soc2Status: trustPortal?.soc2_status,
    soc2typeiStatus: trustPortal?.soc2typei_status,
    soc2typeiiStatus: trustPortal?.soc2typeii_status,
    iso27001Status: trustPortal?.iso27001_status,
    gdprStatus: trustPortal?.gdpr_status,
    hipaaStatus: trustPortal?.hipaa_status,
    isVercelDomain: trustPortal?.isVercelDomain,
    vercelVerification: trustPortal?.vercelVerification,
    friendlyUrl: trustPortal?.friendlyUrl,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return {
    title: 'Trust Portal',
  };
}
