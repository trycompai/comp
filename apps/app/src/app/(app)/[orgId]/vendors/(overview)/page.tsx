import { AppOnboarding } from '@/components/app-onboarding';
import { serverApi } from '@/lib/api-server';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import { CreateVendorSheet } from '../components/create-vendor-sheet';
import { VendorsTable } from './components/VendorsTable';

interface VendorsApiResponse {
  data: Array<Record<string, unknown>>;
  count: number;
}

interface PeopleApiResponse {
  data: Array<{
    id: string;
    role: string;
    deactivated: boolean;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
}

interface OnboardingApiResponse {
  triggerJobId: string | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [vendorsResult, peopleResult, onboardingResult] = await Promise.all([
    serverApi.get<VendorsApiResponse>('/v1/vendors'),
    serverApi.get<PeopleApiResponse>('/v1/people'),
    serverApi.get<OnboardingApiResponse>('/v1/organization/onboarding'),
  ]);

  const vendors = vendorsResult.data?.data ?? [];
  const people = peopleResult.data?.data ?? [];
  const assignees = people
    .filter((p) => !p.deactivated && !['employee', 'contractor'].includes(p.role))
    .map((p) => ({
      id: p.id,
      role: p.role,
      user: p.user,
      organizationId: orgId,
      deactivated: false,
    }));

  // GET /v1/organization/onboarding returns { triggerJobId, ... } flat (no data wrapper)
  const onboardingRunId = onboardingResult.data?.triggerJobId ?? null;
  const isEmpty = vendors.length === 0;
  const isOnboardingActive = Boolean(onboardingRunId);

  // Show AppOnboarding only if empty AND onboarding is not active
  if (isEmpty && !isOnboardingActive) {
    return (
      <PageLayout
        header={
          <PageHeader
            title="Vendors"
            actions={<CreateVendorSheet assignees={assignees as any} organizationId={orgId} />}
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
          actions={<CreateVendorSheet assignees={assignees as any} organizationId={orgId} />}
        />
      }
    >
      <VendorsTable
        vendors={vendors as any}
        assignees={assignees as any}
        onboardingRunId={onboardingRunId}
        orgId={orgId}
      />
    </PageLayout>
  );
}
