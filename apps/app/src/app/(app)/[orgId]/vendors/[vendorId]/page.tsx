import type { PeopleResponseDto } from '@/hooks/use-people-api';
import type { VendorResponse } from '@/hooks/use-vendors';
import { serverApi } from '@/lib/server-api-client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VendorDetailTabs } from './components/VendorDetailTabs';
import { toAssigneeOptions } from '../utils/assignees';

interface PageProps {
  params: Promise<{ vendorId: string; locale: string; orgId: string }>;
  searchParams?: Promise<{
    taskItemId?: string;
  }>;
}

/**
 * Vendor detail page - server component
 * Fetches initial data server-side for fast first render
 * Passes data to VendorDetailTabs which handles both Overview and Risk Assessment tabs
 */
export default async function VendorPage({ params, searchParams }: PageProps) {
  const { vendorId, orgId } = await params;
  const { taskItemId } = (await searchParams) ?? {};

  const [vendorResponse, peopleResponse] = await Promise.all([
    serverApi.get<VendorResponse>(`/v1/vendors/${vendorId}`, orgId),
    serverApi.get<{ data: PeopleResponseDto[]; count: number }>(`/v1/people`, orgId),
  ]);

  if (!vendorResponse.data) {
    console.error('[VendorPage] vendor fetch failed', {
      status: vendorResponse.status,
      error: vendorResponse.error,
    });
    if (vendorResponse.status === 404) {
      notFound();
    }
    throw new Error(vendorResponse.error ?? 'Failed to load vendor');
  }

  const assignees = toAssigneeOptions(peopleResponse.data?.data ?? []);

  // Hide vendor-level content when viewing a task in focus mode
  const isViewingTask = Boolean(taskItemId);

  return (
    <VendorDetailTabs
      vendorId={vendorId}
      orgId={orgId}
      vendor={vendorResponse.data}
      assignees={assignees}
      isViewingTask={isViewingTask}
    />
  );
}
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Vendors',
  };
}
