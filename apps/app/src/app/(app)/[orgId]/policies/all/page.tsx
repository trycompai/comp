import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { getValidFilters } from '@/lib/data-table';
import type { SearchParams } from '@/types';
import { db } from '@db';
import type { Metadata } from 'next';
import { FullPolicyHeaderActions } from './components/FullPolicyHeaderActions';
import { PoliciesTable } from './components/policies-table';
import { getPolicies } from './data/queries';
import { searchParamsCache } from './data/validations';

interface PolicyTableProps {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<SearchParams>;
}

export default async function PoliciesPage({ params, searchParams }: PolicyTableProps) {
  const [{ orgId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const search = searchParamsCache.parse(resolvedSearchParams);
  const validFilters = getValidFilters(search.filters);

  const promises = Promise.all([
    getPolicies({
      ...search,
      filters: validFilters,
    }),
  ]);

  const onboarding = await db.onboarding.findFirst({
    where: { organizationId: orgId },
    select: { triggerJobId: true },
  });

  return (
    <PageWithBreadcrumb
      breadcrumbs={[{ label: 'Policies', current: true }]}
      headerRight={<FullPolicyHeaderActions />}
    >
      <PoliciesTable promises={promises} onboardingRunId={onboarding?.triggerJobId ?? null} />
    </PageWithBreadcrumb>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Policies',
  };
}
