import { serverApi } from '@/lib/api-server';
import type { Policy } from '@db';
import { PageHeader, PageLayout, Stack } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PolicyTailoringProvider } from '../all/components/policy-tailoring-context';
import { PolicyFilters } from '../all/components/PolicyFilters';
import { PolicyPageActions } from '../all/components/PolicyPageActions';
import { PolicyChartsClient } from './components/PolicyChartsClient';
import { computePoliciesOverview } from './lib/compute-overview';
import Loading from './loading';

type PolicyWithAssignee = Policy & {
  assignee: { id: string; user: { name: string | null } } | null;
};

interface PoliciesPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function PoliciesPage({ params }: PoliciesPageProps) {
  const { orgId } = await params;

  const policiesRes = await serverApi.get<{ data: PolicyWithAssignee[] }>(
    '/v1/policies',
  );
  const policies = Array.isArray(policiesRes.data?.data)
    ? policiesRes.data.data
    : [];

  // Compute overview from policies (same logic used client-side)
  const initialOverview = computePoliciesOverview(
    policies.map((p) => ({
      id: p.id,
      status: p.status,
      isArchived: p.isArchived,
      assigneeId: p.assigneeId,
      assignee: p.assignee,
    })),
  );

  return (
    <PageLayout>
      <Stack gap="md">
        <PageHeader
          title="Policies"
          actions={<PolicyPageActions policies={policies.filter((p) => !p.isArchived)} />}
        />
        <Suspense fallback={<Loading />}>
          <PolicyChartsClient organizationId={orgId} initialData={initialOverview} />
        </Suspense>
        <PolicyTailoringProvider statuses={{}}>
          <PolicyFilters policies={policies} />
        </PolicyTailoringProvider>
      </Stack>
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Policies',
  };
}
