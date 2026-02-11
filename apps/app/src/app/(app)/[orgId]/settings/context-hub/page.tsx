import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { ContextTable } from './ContextTable';

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

  const pageNum = Number(page) || 1;
  const perPageNum = Number(perPage) || 50;

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  queryParams.set('page', String(pageNum));
  queryParams.set('perPage', String(perPageNum));

  const res = await serverApi.get<{
    data: any[];
    count: number;
    pageCount: number;
  }>(`/v1/context?${queryParams.toString()}`);

  return (
    <ContextTable
      entries={res.data?.data ?? []}
      pageCount={res.data?.pageCount ?? 0}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Context',
  };
}
