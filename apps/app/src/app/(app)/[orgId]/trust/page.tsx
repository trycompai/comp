import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@db';
import { Prisma } from '@prisma/client';
import { Button, PageHeader, PageLayout } from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { TrustPortalSwitch } from './portal-settings/components/TrustPortalSwitch';

/**
 * Valid compliance badge types for trust portal
 */
type ComplianceBadgeType =
  | 'soc2'
  | 'iso27001'
  | 'iso42001'
  | 'gdpr'
  | 'hipaa'
  | 'pci_dss'
  | 'nen7510'
  | 'iso9001';

interface ComplianceBadge {
  type: ComplianceBadgeType;
  verified: boolean;
}

/**
 * Map certification type strings from risk assessment to badge types
 */
function mapCertificationToBadgeType(certType: string): ComplianceBadgeType | null {
  const normalized = certType.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalized.includes('soc2') || normalized.includes('soc 2')) {
    return 'soc2';
  }
  if (normalized.includes('iso27001') || normalized.includes('iso 27001')) {
    return 'iso27001';
  }
  if (normalized.includes('iso42001') || normalized.includes('iso 42001')) {
    return 'iso42001';
  }
  if (normalized.includes('gdpr')) {
    return 'gdpr';
  }
  if (normalized.includes('hipaa')) {
    return 'hipaa';
  }
  if (
    normalized.includes('pcidss') ||
    normalized.includes('pci dss') ||
    normalized.includes('pci_dss')
  ) {
    return 'pci_dss';
  }
  if (normalized.includes('nen7510') || normalized.includes('nen 7510')) {
    return 'nen7510';
  }
  if (normalized.includes('iso9001') || normalized.includes('iso 9001')) {
    return 'iso9001';
  }

  return null;
}

/**
 * Extract compliance badges from risk assessment data
 */
function extractComplianceBadges(data: Prisma.JsonValue): ComplianceBadge[] | null {
  try {
    const parsed = data as {
      certifications?: Array<{ type: string; status: string }>;
    };

    if (!parsed?.certifications || !Array.isArray(parsed.certifications)) {
      return null;
    }

    const badges: ComplianceBadge[] = [];
    const seenTypes = new Set<ComplianceBadgeType>();

    for (const cert of parsed.certifications) {
      if (cert.status !== 'verified') {
        continue;
      }

      const badgeType = mapCertificationToBadgeType(cert.type);
      if (badgeType && !seenTypes.has(badgeType)) {
        seenTypes.add(badgeType);
        badges.push({ type: badgeType, verified: true });
      }
    }

    return badges.length > 0 ? badges : null;
  } catch {
    return null;
  }
}

/**
 * Generate logo URL using Google Favicon API
 */
function generateLogoUrl(website: string | null): string | null {
  if (!website) return null;

  try {
    const urlWithProtocol = website.startsWith('http') ? website : `https://${website}`;
    const parsed = new URL(urlWithProtocol);
    const domain = parsed.hostname.replace(/^www\./, '');
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return null;
  }
}

/**
 * Sync vendor trust portal data from GlobalVendors risk assessment
 * Updates compliance badges and logo URL if they can be derived from existing data
 */
async function syncVendorTrustData(vendor: {
  id: string;
  website: string | null;
  complianceBadges: Prisma.JsonValue | null;
  logoUrl: string | null;
}): Promise<{ complianceBadges: ComplianceBadge[] | null; logoUrl: string | null } | null> {
  const updates: Prisma.VendorUpdateInput = {};
  let hasUpdates = false;

  // Look up GlobalVendors record by website to get risk assessment data
  if (vendor.website) {
    const globalVendor = await db.globalVendors.findUnique({
      where: { website: vendor.website },
      select: { riskAssessmentData: true },
    });

    if (globalVendor?.riskAssessmentData) {
      const extractedBadges = extractComplianceBadges(globalVendor.riskAssessmentData);
      if (extractedBadges && extractedBadges.length > 0) {
        // Only update if current badges are empty or different
        const currentBadges = vendor.complianceBadges as ComplianceBadge[] | null;
        const currentTypes = new Set(currentBadges?.map((b) => b.type) ?? []);
        const extractedTypes = new Set(extractedBadges.map((b) => b.type));

        const isDifferent =
          currentTypes.size !== extractedTypes.size ||
          [...extractedTypes].some((t) => !currentTypes.has(t));

        if (isDifferent) {
          updates.complianceBadges = extractedBadges as unknown as Prisma.InputJsonValue;
          hasUpdates = true;
        }
      }
    }
  }

  // Generate logo URL if missing
  if (!vendor.logoUrl && vendor.website) {
    const logoUrl = generateLogoUrl(vendor.website);
    if (logoUrl) {
      updates.logoUrl = logoUrl;
      hasUpdates = true;
    }
  }

  // Apply updates if any
  if (hasUpdates) {
    const updated = await db.vendor.update({
      where: { id: vendor.id },
      data: updates,
      select: { complianceBadges: true, logoUrl: true },
    });
    return {
      complianceBadges: updated.complianceBadges as ComplianceBadge[] | null,
      logoUrl: updated.logoUrl,
    };
  }

  return null;
}

export default async function TrustPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  // Ensure Trust record exists with default friendlyUrl
  await ensureTrustRecord(orgId);
  const trustPortal = await getTrustPortal(orgId);
  const organization = await db.organization.findUnique({
    where: { id: orgId },
    select: { primaryColor: true },
  });
  const certificateFiles = await fetchComplianceCertificates(orgId);
  const faqs = await fetchOrganizationFaqs(orgId);

  // Fetch Mission & Vision from Context Hub as default content if overview is empty
  let defaultMissionContent: string | null = null;
  if (!trustPortal?.overviewContent) {
    const missionContext = await db.context.findFirst({
      where: {
        organizationId: orgId,
        question: 'Mission & Vision',
      },
      select: { answer: true },
    });
    defaultMissionContent = missionContext?.answer ?? null;
  }
  const additionalDocuments = await db.trustDocument.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch custom links
  const customLinks = await db.trustCustomLink.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { order: 'asc' },
  });

  // Fetch vendors with risk assessment data for syncing
  const vendorsRaw = await db.vendor.findMany({
    where: { organizationId: orgId },
    orderBy: [{ trustPortalOrder: 'asc' }, { name: 'asc' }],
  });

  // Sync compliance badges and logos from GlobalVendors risk assessment data
  // This runs in parallel for all vendors that need updates
  const syncPromises = vendorsRaw.map(async (vendor) => {
    const updated = await syncVendorTrustData({
      id: vendor.id,
      website: vendor.website,
      complianceBadges: vendor.complianceBadges,
      logoUrl: vendor.logoUrl,
    });
    if (updated) {
      return { ...vendor, ...updated };
    }
    return vendor;
  });

  const vendors = await Promise.all(syncPromises);

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
        primaryColor={organization?.primaryColor ?? null}
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
        overview={{
          overviewTitle: trustPortal?.overviewTitle ?? null,
          overviewContent: trustPortal?.overviewContent ?? defaultMissionContent,
          showOverview: trustPortal?.showOverview ?? false,
        }}
        customLinks={customLinks}
        vendors={vendors.map((v) => ({
          ...v,
          complianceBadges: v.complianceBadges as any,
        }))}
        faviconUrl={trustPortal?.faviconUrl ?? null}
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

  // Get favicon URL if available
  let faviconUrl: string | null = null;
  if (trustPortal?.favicon && s3Client && APP_AWS_ORG_ASSETS_BUCKET) {
    try {
      const command = new GetObjectCommand({
        Bucket: APP_AWS_ORG_ASSETS_BUCKET,
        Key: trustPortal.favicon,
      });
      faviconUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch {
      // If favicon fetch fails, continue without it
    }
  }

  return {
    enabled: trustPortal?.status === 'published',
    domain: trustPortal?.domain ?? '',
    domainVerified: trustPortal?.domainVerified ?? false,
    contactEmail: trustPortal?.contactEmail ?? null,
    primaryColor: null,
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
    overviewTitle: trustPortal?.overviewTitle,
    overviewContent: trustPortal?.overviewContent,
    showOverview: trustPortal?.showOverview,
    faviconUrl,
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
