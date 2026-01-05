import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import { extractDomain } from '@/utils/normalize-website';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { VendorActions } from './components/VendorActions';
import { VendorPageClient } from './components/VendorPageClient';

interface PageProps {
  params: Promise<{ vendorId: string; locale: string; orgId: string }>;
  searchParams?: Promise<{
    taskItemId?: string;
  }>;
}

/**
 * Vendor detail page - server component
 * Fetches initial data server-side for fast first render
 * Passes data to VendorPageClient which uses SWR for real-time updates
 */
export default async function VendorPage({ params, searchParams }: PageProps) {
  const { vendorId, orgId } = await params;
  const { taskItemId } = (await searchParams) ?? {};
  
  // Fetch data in parallel for faster loading
  const [vendorData, assignees] = await Promise.all([
    getVendor({ vendorId, organizationId: orgId }),
    getAssignees(orgId),
  ]);

  if (!vendorData || !vendorData.vendor) {
    redirect('/');
  }

  // Hide vendor-level content when viewing a task in focus mode
  const isViewingTask = Boolean(taskItemId);

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Vendors', href: `/${orgId}/vendors` },
        {
          label: vendorData.vendor?.name ?? '',
          // Make vendor name clickable when viewing a task to navigate back to vendor overview
          href: isViewingTask ? `/${orgId}/vendors/${vendorId}` : undefined,
          current: !isViewingTask,
        },
      ]}
      headerRight={<VendorActions vendorId={vendorId} orgId={orgId} />}
    >
      <VendorPageClient
        vendorId={vendorId}
        orgId={orgId}
        initialVendor={vendorData.vendor}
        assignees={assignees}
        isViewingTask={isViewingTask}
      />
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
    include: {
      assignee: {
        include: {
          user: true,
        },
      },
    },
  });

  // Fetch risk assessment from GlobalVendors if vendor has a website
  // Find ALL duplicates and prefer the one WITH risk assessment data (most recent)
  const domain = extractDomain(vendor?.website ?? null);
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

  // Merge GlobalVendors risk assessment data into vendor object for backward compatibility
  const vendorWithRiskAssessment = vendor
    ? {
        ...vendor,
        riskAssessmentData: globalVendor?.riskAssessmentData ?? null,
        riskAssessmentVersion: globalVendor?.riskAssessmentVersion ?? null,
        riskAssessmentUpdatedAt: globalVendor?.riskAssessmentUpdatedAt ?? null,
      }
    : null;

  return {
    vendor: vendorWithRiskAssessment,
    globalVendor,
  };
});

const getAssignees = cache(async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return [];
  }

  const assignees = await db.member.findMany({
    where: {
      organizationId,
      role: {
        notIn: ['employee', 'contractor'],
      },
      deactivated: false,
    },
    include: {
      user: true,
    },
  });

  return assignees;
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Vendors',
  };
}
