import { serverApi } from '@/lib/api-server';
import { redirect } from 'next/navigation';
import { FrameworkDetailContent } from './components/FrameworkDetailContent';
import type { FrameworkUpdateStatus } from '@/types/framework-versioning';

interface PageProps {
  params: Promise<{
    orgId: string;
    frameworkInstanceId: string;
  }>;
}

export default async function FrameworkPage({ params }: PageProps) {
  const { orgId: organizationId, frameworkInstanceId } = await params;

  const [frameworkRes, updateStatusRes] = await Promise.all([
    serverApi.get<any>(`/v1/frameworks/${frameworkInstanceId}`),
    serverApi.get<{ data: FrameworkUpdateStatus }>(
      `/v1/frameworks/${frameworkInstanceId}/update-status`,
    ),
  ]);

  if (!frameworkRes.data) {
    redirect(`/${organizationId}/frameworks`);
  }

  return (
    <FrameworkDetailContent
      orgId={organizationId}
      frameworkInstanceId={frameworkInstanceId}
      initialFramework={frameworkRes.data}
      initialUpdateStatus={updateStatusRes.data?.data ?? undefined}
    />
  );
}
