import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { getValidFilters } from '@/lib/data-table';
import type { SearchParams } from '@/types';
import { T } from 'gt-next';
import { getGT } from 'gt-next/server';
import type { Metadata } from 'next';
import { PoliciesTable } from './components/policies-table';
import { getPolicies } from './data/queries';
import { searchParamsCache } from './data/validations';

interface PolicyTableProps {
  searchParams: Promise<SearchParams>;
}

export default async function PoliciesPage({ ...props }: PolicyTableProps) {
  const { getGT } = await import('gt-next/server');
  const t = await getGT();
  
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);
  const validFilters = getValidFilters(search.filters);

  const promises = Promise.all([
    getPolicies({
      ...search,
      filters: validFilters,
    }),
  ]);

  return (
    <PageWithBreadcrumb breadcrumbs={[{ label: t('Policies'), current: true }]}>
      <PoliciesTable promises={promises} />
    </PageWithBreadcrumb>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGT();
  return {
    title: t('Policies'),
  };
}
