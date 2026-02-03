import { requireRoutePermission } from '@/lib/permissions.server';
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

  await requireRoutePermission('settings/context-hub', orgId);

  const { search, page, perPage } = await searchParams;

  const entriesResult = await getContextEntries({
    orgId,
    search,
    page: Number(page) || 1,
    perPage: Number(perPage) || 50,
  });

  return <ContextTable entries={entriesResult.data} pageCount={entriesResult.pageCount} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Context',
  };
}
