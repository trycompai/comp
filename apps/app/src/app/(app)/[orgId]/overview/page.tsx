import { getFeatureFlags } from '@/app/posthog';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import type { FrameworkEditorFramework, Policy, Task } from '@db';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import { headers } from 'next/headers';
import { FrameworkUpdatesBanner } from './components/FrameworkUpdatesBanner';
import { Overview } from './components/Overview';
import { OverviewTabs } from './components/OverviewTabs';
import { OverviewNudges } from './nudges/OverviewNudges';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';

export async function generateMetadata() {
  return { title: 'Overview' };
}

type FrameworkWithScore = FrameworkInstanceWithControls & { complianceScore: number };

interface ScoresResponse {
  policies: {
    total: number;
    published: number;
    draftPolicies: Policy[];
    policiesInReview: Policy[];
    unpublishedPolicies: Policy[];
  };
  tasks: {
    total: number;
    done: number;
    incompleteTasks: Task[];
  };
  people: { total: number; completed: number };
  documents: { totalDocuments: number; completedDocuments: number; outstandingDocuments: number };
  onboardingTriggerJobId: string | null;
  currentMember: { id: string; role: string } | null;
}

export default async function OverviewPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: organizationId } = await params;

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  const [scoresRes, frameworksRes, availableRes, settingsRes] = await Promise.all([
    serverApi.get<ScoresResponse>('/v1/frameworks/scores'),
    serverApi.get<{ data: FrameworkWithScore[] }>('/v1/frameworks?includeControls=true&includeScores=true'),
    serverApi.get<{ data: FrameworkEditorFramework[] }>('/v1/frameworks/available'),
    serverApi.get<{ isConfigured?: boolean }>('/v1/trust-portal/settings'),
  ]);

  const scores = scoresRes.data;
  const frameworksData = frameworksRes.data?.data ?? [];
  const allFrameworks = availableRes.data?.data ?? [];

  let isTrustNdaEnabled = false;
  if (session?.user?.id) {
    const flags = await getFeatureFlags(session.user.id, {
      groups: { organization: organizationId },
    });
    isTrustNdaEnabled =
      flags['is-trust-nda-enabled'] === true || flags['is-trust-nda-enabled'] === 'true';
  }

  // Fail closed: if we can't determine state, don't nudge.
  const isTrustConfigured = settingsRes.data?.isConfigured ?? true;

  const frameworksWithControls = frameworksData.map(
    ({ complianceScore: _score, ...fw }: FrameworkWithScore) => fw,
  );
  const frameworksWithCompliance = frameworksData.map((fw: FrameworkWithScore) => ({
    frameworkInstance: { ...fw, complianceScore: undefined },
    complianceScore: fw.complianceScore ?? 0,
  }));

  return (
    <>
      <FrameworkUpdatesBanner />
      <OverviewNudges
        orgId={organizationId}
        server={{ trust: { isTrustNdaEnabled, isConfigured: isTrustConfigured } }}
      />
      <PageLayout header={<PageHeader title="Overview" tabs={<OverviewTabs />} />}>
        <Overview
        frameworksWithControls={frameworksWithControls}
        frameworksWithCompliance={frameworksWithCompliance}
        allFrameworks={allFrameworks}
        organizationId={organizationId}
        publishedPoliciesScore={{
          totalPolicies: scores?.policies?.total ?? 0,
          publishedPolicies: scores?.policies?.published ?? 0,
          draftPolicies: scores?.policies?.draftPolicies ?? [],
          policiesInReview: scores?.policies?.policiesInReview ?? [],
          unpublishedPolicies: scores?.policies?.unpublishedPolicies ?? [],
        }}
        doneTasksScore={{
          totalTasks: scores?.tasks?.total ?? 0,
          doneTasks: scores?.tasks?.done ?? 0,
          incompleteTasks: scores?.tasks?.incompleteTasks ?? [],
        }}
        documentsScore={{
          totalDocuments: scores?.documents?.totalDocuments ?? 0,
          completedDocuments: scores?.documents?.completedDocuments ?? 0,
          outstandingDocuments: scores?.documents?.outstandingDocuments ?? 0,
        }}
        peopleScore={{
          totalMembers: scores?.people?.total ?? 0,
          completedMembers: scores?.people?.completed ?? 0,
        }}
        currentMember={scores?.currentMember ?? null}
        onboardingTriggerJobId={scores?.onboardingTriggerJobId ?? null}
      />
      </PageLayout>
    </>
  );
}
