import { AppOnboarding } from '@/components/app-onboarding';
import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { CreateRiskSheet } from '@/components/sheets/create-risk-sheet';
import { getValidFilters } from '@/lib/data-table';
import { db } from '@db';
import type { Metadata } from 'next';
import { cache } from 'react';
import { RisksTable } from './RisksTable';
import { getRisks } from './data/getRisks';
import { searchParamsCache } from './data/validations';

export default async function RiskRegisterPage(props: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{
    search: string;
    page: string;
    perPage: string;
    status: string;
    department: string;
    assigneeId: string;
  }>;
}) {
  const { params } = props;
  const { orgId } = await params;

  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);
  const validFilters = getValidFilters(search.filters);

  const searchParamsForTable = {
    ...search,
    filters: validFilters,
  };

  const [risksResult, assignees, onboarding] = await Promise.all([
    getRisks({ orgId, searchParams: searchParamsForTable }),
    getAssignees(orgId),
    db.onboarding.findFirst({
      where: { organizationId: orgId },
      select: { triggerJobId: true },
    }),
  ]);

  const isEmpty = risksResult.data?.length === 0;
  const isDefaultView = search.page === 1 && search.title === '' && validFilters.length === 0;
  const isOnboardingActive = Boolean(onboarding?.triggerJobId);

  // Show AppOnboarding only if empty, default view, AND onboarding is not active
  if (isEmpty && isDefaultView && !isOnboardingActive) {
    return (
      <div className="py-4">
        <AppOnboarding
          title={'Risk Management'}
          description={
            "Identify, assess, and mitigate risks to protect your organization's assets and ensure compliance."
          }
          cta={'Create risk'}
          imageSrcLight="/onboarding/risk-light.webp"
          imageSrcDark="/onboarding/risk-dark.webp"
          imageAlt="Risk Management"
          sheetName="create-risk-sheet"
          faqs={[
            {
              questionKey: 'What is risk management?',
              answerKey:
                "Risk management is the process of identifying, assessing, and controlling threats to an organization's capital and earnings.",
            },
            {
              questionKey: 'Why is risk management important?',
              answerKey:
                'It helps organizations protect their assets, ensure stability, and achieve their objectives by minimizing potential disruptions.',
            },
            {
              questionKey: 'What are the key steps in risk management?',
              answerKey:
                'The key steps are risk identification, risk analysis, risk evaluation, risk treatment, and risk monitoring and review.',
            },
          ]}
        />
        <CreateRiskSheet assignees={assignees} />
      </div>
    );
  }

  return (
    <PageWithBreadcrumb breadcrumbs={[{ label: 'Risks', href: `/${orgId}/risk`, current: true }]}>
      <RisksTable
        risks={risksResult?.data || []}
        pageCount={risksResult.pageCount}
        assignees={assignees}
        onboardingRunId={onboarding?.triggerJobId ?? null}
        searchParams={searchParamsForTable}
        orgId={orgId}
      />
    </PageWithBreadcrumb>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Risks',
  };
}

const getAssignees = cache(async (orgId: string) => {
  if (!orgId) {
    return [];
  }

  return await db.member.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      deactivated: false,
      role: {
        notIn: ['employee', 'contractor'],
      },
    },
    include: {
      user: true,
    },
  });
});
