import { AppOnboarding } from '@/components/app-onboarding';
import type { SearchParams } from '@/types';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import { serverApi } from '@/lib/server-api-client';
import type { VendorResponse } from '@/hooks/use-vendors';
import type { PeopleResponseDto } from '@/hooks/use-people-api';
import { CreateVendorSheet } from '../components/create-vendor-sheet';
import { VendorsTable } from './components/VendorsTable';
import type { GetVendorsSchema } from './data/validations';
import { vendorsSearchParamsCache } from './data/validations';
import { toAssigneeOptions } from '../utils/assignees';
import { buildVendorsQueryString } from '@/lib/vendors-query';

export default async function Page({
  searchParams,
  params,
}: {
  searchParams: SearchParams;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const parsedSearchParams = await vendorsSearchParamsCache.parse(searchParams);
  const primarySort = parsedSearchParams.sort?.[0];
  const sortId =
    primarySort?.id === 'name' || primarySort?.id === 'updatedAt' || primarySort?.id === 'createdAt'
      ? primarySort.id
      : undefined;
  const vendorsQuery = buildVendorsQueryString({
    page: parsedSearchParams.page,
    perPage: parsedSearchParams.perPage,
    name: parsedSearchParams.name || undefined,
    status: parsedSearchParams.status ?? undefined,
    category: parsedSearchParams.category ?? undefined,
    department: parsedSearchParams.department ?? undefined,
    assigneeId: parsedSearchParams.assigneeId ?? undefined,
    sortId,
    sortDesc: typeof primarySort?.desc === 'boolean' ? primarySort.desc : undefined,
  });

  const [vendorsResponse, peopleResponse, onboardingResponse] = await Promise.all([
    serverApi.get<{
      data: VendorResponse[];
      count: number;
      page?: number;
      perPage?: number;
      pageCount?: number;
    }>(`/v1/vendors${vendorsQuery}`, orgId),
    serverApi.get<{ data: PeopleResponseDto[]; count: number }>(`/v1/people`, orgId),
    serverApi.get<{ triggerJobId: string | null }>(`/v1/organization/onboarding`, orgId),
  ]);

  if (!vendorsResponse.data) {
    throw new Error(vendorsResponse.error ?? 'Failed to load vendors');
  }

  const vendors = vendorsResponse.data.data ?? [];
  const assignees = toAssigneeOptions(peopleResponse.data?.data ?? []);

  // Helper function to check if the current view is the default, unfiltered one
  function isDefaultView(params: GetVendorsSchema): boolean {
    return (
      params.filters.length === 0 &&
      !params.status &&
      !params.category &&
      !params.department &&
      !params.assigneeId &&
      params.page === 1 &&
      !params.name
    );
  }

  const isEmpty = vendors.length === 0;
  const isDefault = isDefaultView(parsedSearchParams);
  const onboardingRunId = onboardingResponse.data?.triggerJobId ?? null;
  const isOnboardingActive = Boolean(onboardingRunId);

  // Show AppOnboarding only if empty, default view, AND onboarding is not active
  if (isEmpty && isDefault && !isOnboardingActive) {
    return (
      <PageLayout
        header={
          <PageHeader
            title="Vendors"
            actions={<CreateVendorSheet assignees={assignees} organizationId={orgId} />}
          />
        }
      >
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
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header={
        <PageHeader
          title="Vendors"
          actions={<CreateVendorSheet assignees={assignees} organizationId={orgId} />}
        />
      }
    >
      <VendorsTable
        vendors={vendors}
        assignees={assignees}
        onboardingRunId={onboardingRunId}
        orgId={orgId}
      />
    </PageLayout>
  );
}
