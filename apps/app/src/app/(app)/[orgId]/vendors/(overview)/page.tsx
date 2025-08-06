import { AppOnboarding } from '@/components/app-onboarding';
import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import type { SearchParams } from '@/types';
import { getGT } from 'gt-next/server';
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
  const t = await getGT();

  const parsedSearchParams = await vendorsSearchParamsCache.parse(searchParams);

  const [vendorsResult, assignees] = await Promise.all([
    getVendors(orgId, parsedSearchParams),
    getAssignees(orgId),
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

  // Show onboarding only if the view is default/unfiltered and there's no data
  if (vendorsResult.data.length === 0 && isDefaultView(parsedSearchParams)) {
    return (
      <div className="py-4">
        <AppOnboarding
          title={t('Vendor Management')}
          description={t('Manage your vendors and ensure your organization is protected.')}
          cta={t('Add vendor')}
          imageSrcLight="/onboarding/vendor-light.webp"
          imageSrcDark="/onboarding/vendor-dark.webp"
          imageAlt={t('Vendor Management')}
          sheetName="createVendorSheet"
          faqs={[
            {
              questionKey: t('What is vendor management?'),
              answerKey: t(
                'Vendor management is the process of managing, and controlling relationships and agreements with third-party suppliers of goods and services.',
              ),
            },
            {
              questionKey: t('Why is vendor management important?'),
              answerKey: t(
                'It helps to ensure that you are getting the most value from your vendors, while also minimizing risks and maintaining compliance.',
              ),
            },
            {
              questionKey: t('What are the key steps in vendor management?'),
              answerKey: t(
                'The key steps include vendor selection, contract negotiation, performance monitoring, risk management, and relationship management.',
              ),
            },
          ]}
        />
        <CreateVendorSheet assignees={assignees} />
      </div>
    );
  }

  return (
    <PageWithBreadcrumb
      breadcrumbs={[{ label: t('Vendors'), href: `/${orgId}/vendors`, current: true }]}
    >
      <VendorsTable
        promises={Promise.all([getVendors(orgId, parsedSearchParams), getAssignees(orgId)])}
      />
    </PageWithBreadcrumb>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGT();
  return {
    title: t('Vendors'),
  };
}
