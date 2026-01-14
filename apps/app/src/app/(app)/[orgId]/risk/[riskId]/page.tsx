import { auth } from '@/utils/auth';
import { db } from '@db';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { RiskActions } from './components/RiskActions';
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

/**
 * Risk detail page - server component
 * Fetches initial data server-side for fast first render
 * Passes data to RiskPageClient which uses SWR for real-time updates
 */
export default async function RiskPage({ searchParams, params }: PageProps) {
  const { riskId, orgId } = await params;
  const { taskItemId } = await searchParams;
  const risk = await getRisk(riskId);
  const assignees = await getAssignees();
  
  if (!risk) {
    redirect('/');
  }

  const shortTaskId = (id: string) => id.slice(-6).toUpperCase();
  const isViewingTask = Boolean(taskItemId);

  const breadcrumbs = taskItemId
    ? [
        { label: 'Risks', href: `/${orgId}/risk` },
        { label: risk.title, href: `/${orgId}/risk/${riskId}` },
        { label: shortTaskId(taskItemId), isCurrent: true },
      ]
    : [
        { label: 'Risks', href: `/${orgId}/risk` },
        { label: risk.title, isCurrent: true },
      ];

  return (
    <PageLayout
      header={
        <PageHeader
          title={taskItemId ? shortTaskId(taskItemId) : risk.title}
          breadcrumbs={breadcrumbs}
          actions={<RiskActions riskId={riskId} orgId={orgId} />}
        />
      }
    >
      <RiskPageClient
        riskId={riskId}
        orgId={orgId}
        initialRisk={risk}
        assignees={assignees}
        isViewingTask={isViewingTask}
      />
    </PageLayout>
  );
}

const getRisk = cache(async (riskId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return null;
  }

  const risk = await db.risk.findUnique({
    where: {
      id: riskId,
      organizationId: session.session.activeOrganizationId,
    },
    include: {
      assignee: {
        include: {
          user: true,
        },
      },
    },
  });

  return risk;
});

const getAssignees = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return [];
  }

  const assignees = await db.member.findMany({
    where: {
      organizationId: session.session.activeOrganizationId,
      role: {
        notIn: ['employee', 'contractor'],
      },
      deactivated: false,
    },
    include: {
      user: true,
    },
  });

  return assignees;
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Risk Overview',
  };
}
