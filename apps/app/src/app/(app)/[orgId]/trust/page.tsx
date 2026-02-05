import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { Button, PageHeader, PageLayout } from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import { Prisma } from '@prisma/client';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { TrustPortalSwitch } from './portal-settings/components/TrustPortalSwitch';

export default async function TrustPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  // Ensure Trust record exists with default friendlyUrl
  await ensureTrustRecord(orgId);
  const trustPortal = await getTrustPortal(orgId);
  const certificateFiles = await fetchComplianceCertificates(orgId);
  const faqs = await fetchOrganizationFaqs(orgId);
  const additionalDocuments = await db.trustDocument.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  });

  // Build the public trust portal URL
  const portalUrl =
    trustPortal?.domainVerified && trustPortal.domain
      ? `https://${trustPortal.domain}`
      : `https://trust.inc/${trustPortal?.friendlyUrl ?? orgId}`;

  return (
    <PageLayout
      header={
        <PageHeader
          title="Trust Portal"
          actions={
            <Button iconRight={<Launch />}>
              <Link href={portalUrl} target="_blank" rel="noopener noreferrer">
                Visit Trust Portal
              </Link>
            </Button>
          }
        />
      }
    >
      <TrustPortalSwitch
        orgId={orgId}
        enabled={trustPortal?.enabled ?? false}
        slug={trustPortal?.friendlyUrl ?? orgId}
        domain={trustPortal?.domain ?? ''}
        domainVerified={trustPortal?.domainVerified ?? false}
        contactEmail={trustPortal?.contactEmail ?? null}
        primaryColor={trustPortal?.primaryColor ?? null}
        isVercelDomain={trustPortal?.isVercelDomain ?? false}
        vercelVerification={trustPortal?.vercelVerification ?? null}
        allowedDomains={trustPortal?.allowedDomains ?? []}
        soc2type1={trustPortal?.soc2type1 ?? false}
        soc2type2={trustPortal?.soc2type2 ?? false}
        iso27001={trustPortal?.iso27001 ?? false}
        iso42001={trustPortal?.iso42001 ?? false}
        gdpr={trustPortal?.gdpr ?? false}
        hipaa={trustPortal?.hipaa ?? false}
        pcidss={trustPortal?.pcidss ?? false}
        nen7510={trustPortal?.nen7510 ?? false}
        iso9001={trustPortal?.iso9001 ?? false}
        soc2type1Status={trustPortal?.soc2type1Status ?? 'started'}
        soc2type2Status={trustPortal?.soc2type2Status ?? 'started'}
        iso27001Status={trustPortal?.iso27001Status ?? 'started'}
        iso42001Status={trustPortal?.iso42001Status ?? 'started'}
        gdprStatus={trustPortal?.gdprStatus ?? 'started'}
        hipaaStatus={trustPortal?.hipaaStatus ?? 'started'}
        pcidssStatus={trustPortal?.pcidssStatus ?? 'started'}
        nen7510Status={trustPortal?.nen7510Status ?? 'started'}
        iso9001Status={trustPortal?.iso9001Status ?? 'started'}
        faqs={faqs}
        iso27001FileName={certificateFiles.iso27001FileName}
        iso42001FileName={certificateFiles.iso42001FileName}
        gdprFileName={certificateFiles.gdprFileName}
        hipaaFileName={certificateFiles.hipaaFileName}
        soc2type1FileName={certificateFiles.soc2type1FileName}
        soc2type2FileName={certificateFiles.soc2type2FileName}
        pcidssFileName={certificateFiles.pcidssFileName}
        nen7510FileName={certificateFiles.nen7510FileName}
        iso9001FileName={certificateFiles.iso9001FileName}
        additionalDocuments={additionalDocuments.map((doc) => ({
          id: doc.id,
          name: doc.name,
          description: doc.description,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        }))}
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
    enabled: trustPortal?.status === 'published',
    domain: trustPortal?.domain ?? '',
    domainVerified: trustPortal?.domainVerified ?? false,
    contactEmail: trustPortal?.contactEmail ?? null,
    primaryColor: null, // Not stored in Trust table - fetched from organization if needed
    isVercelDomain: trustPortal?.isVercelDomain ?? false,
    vercelVerification: trustPortal?.vercelVerification ?? null,
    allowedDomains: trustPortal?.allowedDomains ?? [],
    soc2type1: trustPortal?.soc2type1,
    soc2type2: trustPortal?.soc2type2 || trustPortal?.soc2,
    iso27001: trustPortal?.iso27001,
    iso42001: trustPortal?.iso42001,
    gdpr: trustPortal?.gdpr,
    hipaa: trustPortal?.hipaa,
    pcidss: trustPortal?.pci_dss,
    nen7510: trustPortal?.nen7510,
    soc2type1Status: trustPortal?.soc2type1_status,
    soc2type2Status:
      !trustPortal?.soc2type2 && trustPortal?.soc2
        ? trustPortal?.soc2_status
        : trustPortal?.soc2type2_status,
    iso27001Status: trustPortal?.iso27001_status,
    iso42001Status: trustPortal?.iso42001_status,
    gdprStatus: trustPortal?.gdpr_status,
    hipaaStatus: trustPortal?.hipaa_status,
    pcidssStatus: trustPortal?.pci_dss_status,
    nen7510Status: trustPortal?.nen7510_status,
    iso9001: trustPortal?.iso9001,
    iso9001Status: trustPortal?.iso9001_status,
    friendlyUrl: trustPortal?.friendlyUrl,
  };
};

/**
 * Ensure Trust record exists with friendlyUrl defaulting to organizationId
 */
const ensureTrustRecord = async (organizationId: string): Promise<void> => {
  const trust = await db.trust.findUnique({
    where: { organizationId },
    select: { friendlyUrl: true },
  });

  // If trust record exists with friendlyUrl, nothing to do
  if (trust?.friendlyUrl) {
    return;
  }

  // Create or update trust record with organizationId as default friendlyUrl
  try {
    await db.trust.upsert({
      where: { organizationId },
      update: { friendlyUrl: organizationId },
      create: { organizationId, friendlyUrl: organizationId, status: 'published' },
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Conflict on unique constraint - record already exists
      return;
    }
    throw error;
  }
};

type CertificateFiles = {
  iso27001FileName: string | null;
  iso42001FileName: string | null;
  gdprFileName: string | null;
  hipaaFileName: string | null;
  soc2type1FileName: string | null;
  soc2type2FileName: string | null;
  pcidssFileName: string | null;
  nen7510FileName: string | null;
  iso9001FileName: string | null;
};

const API_FRAMEWORK_TO_PROP: Record<string, keyof CertificateFiles> = {
  iso_27001: 'iso27001FileName',
  iso_42001: 'iso42001FileName',
  gdpr: 'gdprFileName',
  hipaa: 'hipaaFileName',
  soc2_type1: 'soc2type1FileName',
  soc2_type2: 'soc2type2FileName',
  pci_dss: 'pcidssFileName',
  nen_7510: 'nen7510FileName',
  iso_9001: 'iso9001FileName',
};

const DEFAULT_CERTIFICATE_FILES: CertificateFiles = {
  iso27001FileName: null,
  iso42001FileName: null,
  gdprFileName: null,
  hipaaFileName: null,
  soc2type1FileName: null,
  soc2type2FileName: null,
  pcidssFileName: null,
  nen7510FileName: null,
  iso9001FileName: null,
};

async function fetchOrganizationPrimaryColor(orgId: string): Promise<string | null> {
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie') || '';
  const apiUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

  try {
    const response = await fetch(`${apiUrl}/v1/organization/primary-color`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch organization primary color:', response.statusText);
      return null;
    }

    const payload = await response.json();
    return payload?.primaryColor;
  } catch (error) {
    console.warn('Error fetching organization primary color:', error);
    return null;
  }
}


async function fetchComplianceCertificates(orgId: string): Promise<CertificateFiles> {
  const result: CertificateFiles = { ...DEFAULT_CERTIFICATE_FILES };
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie') || '';
  const apiUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

  try {
    const response = await fetch(`${apiUrl}/v1/trust-portal/compliance-resources/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ organizationId: orgId }),
    });

    if (!response.ok) {
      console.warn('Failed to fetch compliance resources:', response.statusText);
      return result;
    }

    const payload = await response.json();
    const resources = Array.isArray(payload) ? payload : payload?.resources;

    if (!Array.isArray(resources)) {
      return result;
    }

    for (const resource of resources) {
      const propKey = resource?.framework ? API_FRAMEWORK_TO_PROP[resource.framework] : undefined;
      if (propKey) {
        result[propKey] = resource.fileName ?? null;
      }
    }
  } catch (error) {
    console.warn('Error fetching compliance resources:', error);
  }

  return result;
}

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  order: number;
};

async function fetchOrganizationFaqs(orgId: string): Promise<FaqItem[] | null> {
  try {
    const organization = await db.organization.findUnique({
      where: { id: orgId },
      select: { trustPortalFaqs: true },
    });

    if (!organization?.trustPortalFaqs || organization.trustPortalFaqs === null) {
      return null;
    }

    return Array.isArray(organization.trustPortalFaqs)
      ? (organization.trustPortalFaqs as FaqItem[])
      : null;
  } catch (error) {
    console.warn('Error fetching organization FAQs:', error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Trust Portal',
  };
}
