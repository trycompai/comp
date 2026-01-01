'use server';

import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { VendorRiskAssessmentView } from '@/components/vendor-risk-assessment/VendorRiskAssessmentView';
import { auth } from '@/utils/auth';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { VendorActions } from '../components/VendorActions';
import { VendorHeader } from '../components/VendorHeader';
import { VendorTabs } from '../components/VendorTabs';

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

  if (!vendorResult || !vendorResult.vendor) {
    redirect('/');
  }

  // Hide tabs when viewing a task in focus mode
  const isViewingTask = Boolean(taskItemId);
  const vendor = vendorResult.vendor;

  const riskAssessmentData = vendor.riskAssessmentData;
  const riskAssessmentUpdatedAt = vendor.riskAssessmentUpdatedAt ?? null;

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
      headerRight={<VendorActions vendorId={vendorId} />}
    >
      {!isViewingTask && <VendorHeader vendor={vendor} />}
      {!isViewingTask && <VendorTabs vendorId={vendorId} orgId={orgId} />}
      <div className="flex flex-col gap-4">
        {riskAssessmentData ? (
          <VendorRiskAssessmentView
            source={{
              title: 'Risk Assessment',
              description: JSON.stringify(riskAssessmentData),
              createdAt: (riskAssessmentUpdatedAt ?? vendor.updatedAt).toISOString(),
              entityType: 'vendor',
              createdByName: null,
              createdByEmail: null,
            }}
          />
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {vendor.status === 'in_progress'
                ? 'Risk assessment is being generated. Please check back soon.'
                : 'No risk assessment found yet.'}
            </p>
          </div>
        )}
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
  let globalVendor = null;
  if (vendor.website) {
    globalVendor = await db.globalVendors.findUnique({
      where: { website: vendor.website },
      select: {
        riskAssessmentData: true,
        riskAssessmentVersion: true,
        riskAssessmentUpdatedAt: true,
      },
    });
  }

  return {
    vendor: {
      ...vendor,
      // Use GlobalVendors risk assessment data if available, fallback to Vendor (for migration)
      riskAssessmentData: globalVendor?.riskAssessmentData ?? null,
      riskAssessmentVersion: globalVendor?.riskAssessmentVersion ?? null,
      riskAssessmentUpdatedAt: globalVendor?.riskAssessmentUpdatedAt ?? null,
    },
  };
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Vendor Risk Assessment',
  };
}

