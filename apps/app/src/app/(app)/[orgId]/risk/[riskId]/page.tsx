import { serverApi } from '@/lib/api-server';
import { PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RiskPageClient } from './components/RiskPageClient';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sort?: string;
    page?: string;
    per_page?: string;
    taskItemId?: string;
  }>;
  params: Promise<{ riskId: string; orgId: string }>;
}

export default async function RiskPage({ searchParams, params }: PageProps) {
  const { riskId, orgId } = await params;
  const { taskItemId } = await searchParams;

  const [riskResult, peopleResult] = await Promise.all([
    serverApi.get<any>(`/v1/risks/${riskId}`),
    serverApi.get<any>('/v1/people'),
  ]);

  const risk = riskResult.data;
  if (!risk) {
    redirect('/');
  }

  const assignees = (peopleResult.data?.data ?? [])
    .filter(
      (p: any) =>
        !p.deactivated && !['employee', 'contractor'].includes(p.role),
    )
    .map((p: any) => ({
      id: p.id,
      role: p.role,
      deactivated: p.deactivated,
      user: p.user,
      organizationId: orgId,
      isActive: true,
      userId: p.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

  return (
    <PageLayout>
      <RiskPageClient
        riskId={riskId}
        orgId={orgId}
        initialRisk={risk}
        assignees={assignees}
        taskItemId={taskItemId ?? null}
      />
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Risk Overview',
  };
}
