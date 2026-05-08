import { serverApi } from '@/lib/api-server';
import type { Policy } from '@db';
import { PageHeader, PageLayout, Stack } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { Suspense } from 'react';
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

  // ENG-108: fetch the active onboarding run id alongside policies so the
  // client-side filters component can subscribe and surface "tailoring your
  // policies…" status during first-run AI generation. Mirrors the pattern
  // used by the risks and vendors pages.
  const [policiesRes, onboardingRes] = await Promise.all([
    serverApi.get<{ data: PolicyWithAssignee[] }>('/v1/policies'),
    serverApi.get<{
      triggerJobId: string | null;
      triggerJobCompleted: boolean;
    } | null>('/v1/organization/onboarding'),
  ]);

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
        <PolicyFilters
          policies={policies}
          onboardingRunId={onboardingRes.data?.triggerJobId ?? null}
        />
      </Stack>
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Policies',
  };
}
