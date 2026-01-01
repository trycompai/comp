'use server';

import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import { CommentEntityType, db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { Comments } from '../../../../../components/comments/Comments';
import { TaskItems } from '../../../../../components/task-items/TaskItems';
import { VendorActions } from './components/VendorActions';
import { VendorInherentRiskChart } from './components/VendorInherentRiskChart';
import { VendorResidualRiskChart } from './components/VendorResidualRiskChart';
import { VendorTabs } from './components/VendorTabs';
import { VendorHeader } from './components/VendorHeader';
import { SecondaryFields } from './components/secondary-fields/secondary-fields';

interface PageProps {
  params: Promise<{ vendorId: string; locale: string; orgId: string }>;
  searchParams?: Promise<{
    taskItemId?: string;
  }>;
}

export default async function VendorPage({ params, searchParams }: PageProps) {
  const { vendorId, orgId } = await params;
  const { taskItemId } = (await searchParams) ?? {};
  
  // Fetch data in parallel for faster loading
  const [vendor, assignees] = await Promise.all([
    getVendor({ vendorId, organizationId: orgId }),
    getAssignees(orgId),
  ]);

  if (!vendor || !vendor.vendor) {
    redirect('/');
  }

  // Hide vendor-level content when viewing a task in focus mode
  const isViewingTask = Boolean(taskItemId);

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Vendors', href: `/${orgId}/vendors` },
        {
          label: vendor.vendor?.name ?? '',
          // Make vendor name clickable when viewing a task to navigate back to vendor overview
          href: isViewingTask ? `/${orgId}/vendors/${vendorId}` : undefined,
          current: !isViewingTask,
        },
      ]}
      headerRight={<VendorActions vendorId={vendorId} />}
    >
      {!isViewingTask && <VendorHeader vendor={vendor.vendor} />}
      {!isViewingTask && <VendorTabs vendorId={vendorId} orgId={orgId} />}
      <div className="flex flex-col gap-4">
        {!isViewingTask && (
          <>
            <SecondaryFields
              vendor={vendor.vendor}
              assignees={assignees}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <VendorInherentRiskChart vendor={vendor.vendor} />
              <VendorResidualRiskChart vendor={vendor.vendor} />
            </div>
          </>
        )}
        <TaskItems
          entityId={vendorId}
          entityType="vendor"
          organizationId={orgId}
        />
        {!isViewingTask && (
          <Comments entityId={vendorId} entityType={CommentEntityType.vendor} />
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
    include: {
      assignee: {
        include: {
          user: true,
        },
      },
    },
  });

  // Fetch risk assessment from GlobalVendors if vendor has a website
  let globalVendor = null;
  if (vendor?.website) {
    globalVendor = await db.globalVendors.findUnique({
      where: { website: vendor.website },
      select: {
        riskAssessmentData: true,
        riskAssessmentVersion: true,
        riskAssessmentUpdatedAt: true,
      },
    });
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
