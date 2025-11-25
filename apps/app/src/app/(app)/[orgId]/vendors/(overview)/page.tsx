import { AppOnboarding } from '@/components/app-onboarding';
import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import type { SearchParams } from '@/types';
import { db } from '@db';
import type { Metadata } from 'next';
import { CreateVendorSheet } from '../components/create-vendor-sheet';
import { VendorsTable } from './components/VendorsTable';
import { getAssignees, getVendors } from './data/queries';
import type { GetVendorsSchema } from './data/validations';
import { vendorsSearchParamsCache } from './data/validations';

export default async function Page({
  searchParams,
  params,
}: {
  searchParams: SearchParams;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const parsedSearchParams = await vendorsSearchParamsCache.parse(searchParams);

  const [vendorsResult, assignees, onboarding] = await Promise.all([
    getVendors(orgId, parsedSearchParams),
    getAssignees(orgId),
    db.onboarding.findFirst({
      where: { organizationId: orgId },
      select: { triggerJobId: true },
    }),
  ]);

  // Helper function to check if the current view is the default, unfiltered one
  function isDefaultView(params: GetVendorsSchema): boolean {
    return (
      params.filters.length === 0 &&
      !params.status &&
      !params.department &&
      !params.assigneeId &&
      params.page === 1 &&
      !params.name
    );
  }

  const isEmpty = vendorsResult.data.length === 0;
  const isDefault = isDefaultView(parsedSearchParams);
  const isOnboardingActive = Boolean(onboarding?.triggerJobId);

  // Show AppOnboarding only if empty, default view, AND onboarding is not active
  if (isEmpty && isDefault && !isOnboardingActive) {
    return (
      <div className="py-4">
        <AppOnboarding
          title={'Vendor Management'}
          description={'Manage your vendors and ensure your organization is protected.'}
          cta={'Add vendor'}
          imageSrcLight="/onboarding/vendor-light.webp"
          imageSrcDark="/onboarding/vendor-dark.webp"
          imageAlt="Vendor Management"
          sheetName="createVendorSheet"
          faqs={[
            {
              questionKey: 'What is vendor management?',
              answerKey:
                'Vendor management is the process of managing, and controlling relationships and agreements with third-party suppliers of goods and services.',
            },
            {
              questionKey: 'Why is vendor management important?',
              answerKey:
                'It helps to ensure that you are getting the most value from your vendors, while also minimizing risks and maintaining compliance.',
            },
            {
              questionKey: 'What are the key steps in vendor management?',
              answerKey:
                'The key steps include vendor selection, contract negotiation, performance monitoring, risk management, and relationship management.',
            },
          ]}
        />
        <CreateVendorSheet assignees={assignees} />
      </div>
    );
  }

  return (
    <PageWithBreadcrumb
      breadcrumbs={[{ label: 'Vendors', href: `/${orgId}/vendors`, current: true }]}
    >
      <VendorsTable
        vendors={vendorsResult.data}
        pageCount={vendorsResult.pageCount}
        assignees={assignees}
        onboardingRunId={onboarding?.triggerJobId ?? null}
        searchParams={parsedSearchParams}
        orgId={orgId}
      />
    </PageWithBreadcrumb>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Vendors',
  };
}
