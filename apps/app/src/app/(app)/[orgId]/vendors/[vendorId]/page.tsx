import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { VendorDetailTabs } from './components/VendorDetailTabs';

interface PageProps {
  params: Promise<{ vendorId: string; locale: string; orgId: string }>;
  searchParams?: Promise<{
    taskItemId?: string;
  }>;
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

/**
 * Vendor detail page - server component
 * Fetches initial data server-side for fast first render
 * Passes data to VendorDetailTabs which handles both Overview and Risk Assessment tabs
 */
export default async function VendorPage({ params, searchParams }: PageProps) {
  const { vendorId, orgId } = await params;
  const { taskItemId } = (await searchParams) ?? {};

  // Fetch data in parallel for faster loading
  // GET /v1/vendors/:id returns vendor fields flat (no data wrapper)
  // GET /v1/people returns { data: people[], count }
  const [vendorResult, peopleResult] = await Promise.all([
    serverApi.get<Record<string, unknown>>(`/v1/vendors/${vendorId}`),
    serverApi.get<PeopleApiResponse>('/v1/people'),
  ]);

  const vendor = vendorResult.data;

  if (!vendor) {
    redirect('/');
  }

  // Transform people to assignees (filter out employee/contractor, filter deactivated)
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

  // Hide vendor-level content when viewing a task in focus mode
  const isViewingTask = Boolean(taskItemId);

  return (
    <VendorDetailTabs
      vendorId={vendorId}
      orgId={orgId}
      vendor={vendor as any}
      assignees={assignees as any}
      isViewingTask={isViewingTask}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Vendors',
  };
}
