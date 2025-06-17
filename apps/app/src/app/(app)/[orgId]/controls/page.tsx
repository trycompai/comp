import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { getValidFilters } from '@/lib/data-table';
import { Metadata } from 'next';
import { SearchParams } from 'nuqs';
import { ControlsTable } from './components/controls-table';
import { getControls } from './data/queries';
import { searchParamsCache } from './data/validations';

interface ControlTableProps {
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Controls',
  };
}

export default async function ControlsPage({ ...props }: ControlTableProps) {
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);
  const validFilters = getValidFilters(search.filters);

  const promises = Promise.all([
    getControls({
      ...search,
      filters: validFilters,
    }),
  ]);

  return (
    <PageWithBreadcrumb breadcrumbs={[{ label: 'Controls', current: true }]}>
      <ControlsTable promises={promises} />
    </PageWithBreadcrumb>
  );
}
