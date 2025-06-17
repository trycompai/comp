import PageCore from '@/components/pages/PageCore.tsx';
import type { Metadata } from 'next';
import { ContextTable } from './ContextTable';
import { getContextEntries } from './data/getContextEntries';

export default async function ContextHubSettings({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{
    search: string;
    page: string;
    perPage: string;
  }>;
}) {
  const { orgId } = await params;
  const { search, page, perPage } = await searchParams;

  const entriesResult = await getContextEntries({
    orgId,
    search,
    page: Number(page) || 1,
    perPage: Number(perPage) || 50,
  });

  return (
    <PageCore>
      <ContextTable entries={entriesResult.data} pageCount={entriesResult.pageCount} />
    </PageCore>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Context',
  };
}
