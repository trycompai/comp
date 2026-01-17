import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import type { VendorResponse } from '@/hooks/use-vendors';
import { auth } from '@/utils/auth';
import { extractDomain } from '@/utils/normalize-website';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { VendorActions } from '../components/VendorActions';
import { VendorHeader } from '../components/VendorHeader';
import { VendorTabs } from '../components/VendorTabs';
import { VendorReviewClient } from './components/VendorReviewClient';

interface ReviewPageProps {
  params: Promise<{ vendorId: string; locale: string; orgId: string }>;
  searchParams?: Promise<{
    taskItemId?: string;
  }>;
}

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const { vendorId, orgId } = await params;
  const { taskItemId } = (await searchParams) ?? {};
  
  const vendorResult = await getVendor({ vendorId, organizationId: orgId });

  if (!vendorResult || !vendorResult.vendor || !vendorResult.vendorForClient) {
    redirect('/');
  }

  // Hide tabs when viewing a task in focus mode
  const isViewingTask = Boolean(taskItemId);
  const { vendor, vendorForClient } = vendorResult;

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Vendors', href: `/${orgId}/vendors` },
        { label: vendor?.name ?? '', href: `/${orgId}/vendors/${vendorId}` },
        {
          label: 'Risk Assessment',
          // Make Risk Assessment clickable when viewing a task to navigate back to review page
          href: isViewingTask ? `/${orgId}/vendors/${vendorId}/review` : undefined,
          current: !isViewingTask,
        },
      ]}
      headerRight={<VendorActions vendorId={vendorId} orgId={orgId} />}
    >
      {!isViewingTask && <VendorHeader vendor={vendor} />}
      {!isViewingTask && <VendorTabs vendorId={vendorId} orgId={orgId} />}
      <div className="flex flex-col gap-4">
        <VendorReviewClient
          vendorId={vendorId}
          orgId={orgId}
          initialVendor={vendorForClient}
        />
      </div>
    </PageWithBreadcrumb>
  );
}

const getVendor = cache(async (params: { vendorId: string; organizationId: string }) => {
  const { vendorId, organizationId } = params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  const vendor = await db.vendor.findUnique({
    where: {
      id: vendorId,
      organizationId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      website: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      category: true,
      inherentProbability: true,
      inherentImpact: true,
      residualProbability: true,
      residualImpact: true,
      organizationId: true,
      assigneeId: true,
    },
  });

  if (!vendor) {
    return null;
  }

  // Fetch risk assessment from GlobalVendors if vendor has a website
  // Find ALL duplicates and prefer the one WITH risk assessment data (most recent)
  const domain = extractDomain(vendor.website ?? null);
  let globalVendor = null;
  if (domain) {
    const duplicates = await db.globalVendors.findMany({
      where: {
        website: {
          contains: domain,
        },
      },
      select: {
        website: true,
        riskAssessmentData: true,
        riskAssessmentVersion: true,
        riskAssessmentUpdatedAt: true,
      },
      orderBy: [
        { riskAssessmentUpdatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    
    // Prefer record WITH risk assessment data (most recent)
    globalVendor = duplicates.find((gv) => gv.riskAssessmentData !== null) ?? duplicates[0] ?? null;
  }

  // Return vendor with Date objects for VendorHeader (server component compatible)
  const vendorWithRiskAssessment = {
    ...vendor,
    riskAssessmentData: globalVendor?.riskAssessmentData ?? null,
    riskAssessmentVersion: globalVendor?.riskAssessmentVersion ?? null,
    riskAssessmentUpdatedAt: globalVendor?.riskAssessmentUpdatedAt ?? null,
  };

  // Serialize dates to strings for VendorReviewClient (client component)
  const vendorForClient: VendorResponse = {
    ...vendor,
    description: vendor.description ?? '',
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
    riskAssessmentData: globalVendor?.riskAssessmentData ?? null,
    riskAssessmentVersion: globalVendor?.riskAssessmentVersion ?? null,
    riskAssessmentUpdatedAt: globalVendor?.riskAssessmentUpdatedAt?.toISOString() ?? null,
  };

  return {
    vendor: vendorWithRiskAssessment,
    vendorForClient,
  };
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Vendor Risk Assessment',
  };
}

