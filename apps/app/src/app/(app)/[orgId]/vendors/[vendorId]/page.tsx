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
  const vendor = await getVendor(vendorId);
  const assignees = await getAssignees();

  if (!vendor || !vendor.vendor) {
    redirect('/');
  }

  const shortTaskId = (id: string) => id.slice(-6).toUpperCase();

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Vendors', href: `/${orgId}/vendors` },
        ...(taskItemId
          ? [
              { label: vendor.vendor?.name ?? '', href: `/${orgId}/vendors/${vendorId}` },
              { label: shortTaskId(taskItemId), current: true },
            ]
          : [{ label: vendor.vendor?.name ?? '', current: true }]),
      ]}
      headerRight={<VendorActions vendorId={vendorId} />}
    >
      <div className="flex flex-col gap-4">
        {!taskItemId && (
          <>
            <SecondaryFields
              vendor={vendor.vendor}
              assignees={assignees}
              globalVendor={vendor.globalVendor}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <VendorInherentRiskChart vendor={vendor.vendor} />
              <VendorResidualRiskChart vendor={vendor.vendor} />
            </div>
          </>
        )}
        <TaskItems entityId={vendorId} entityType="vendor" />
        {!taskItemId && (
          <Comments entityId={vendorId} entityType={CommentEntityType.vendor} />
        )}
      </div>
    </PageWithBreadcrumb>
  );
}

const getVendor = cache(async (vendorId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return null;
  }

  const vendor = await db.vendor.findUnique({
    where: {
      id: vendorId,
      organizationId: session.session.activeOrganizationId,
    },
    include: {
      assignee: {
        include: {
          user: true,
        },
      },
    },
  });

  if (vendor?.website) {
    const globalVendor = await db.globalVendors.findFirst({
      where: {
        website: vendor.website,
      },
    });

    return {
      vendor: vendor,
      globalVendor,
    };
  }

  return {
    vendor: vendor,
    globalVendor: null,
  };
});

const getAssignees = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return [];
  }

  const assignees = await db.member.findMany({
    where: {
      organizationId: session.session.activeOrganizationId,
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
