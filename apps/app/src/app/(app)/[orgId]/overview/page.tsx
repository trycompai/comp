import { serverApi } from '@/lib/api-server';
import type { FrameworkEditorFramework, Policy, Task } from '@db';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import { Overview, type FindingWithTarget } from './components/Overview';
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
  findings: FindingWithTarget[];
  onboardingTriggerJobId: string | null;
  currentMember: { id: string; role: string } | null;
}

export default async function OverviewPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: organizationId } = await params;

  const [scoresRes, frameworksRes, availableRes] = await Promise.all([
    serverApi.get<ScoresResponse>('/v1/frameworks/scores'),
    serverApi.get<{ data: FrameworkWithScore[] }>('/v1/frameworks?includeControls=true&includeScores=true'),
    serverApi.get<{ data: FrameworkEditorFramework[] }>('/v1/frameworks/available'),
  ]);

  const scores = scoresRes.data;
  const frameworksData = frameworksRes.data?.data ?? [];
  const allFrameworks = availableRes.data?.data ?? [];

  const frameworksWithControls = frameworksData.map(
    ({ complianceScore: _score, ...fw }: FrameworkWithScore) => fw,
  );
  const frameworksWithCompliance = frameworksData.map((fw: FrameworkWithScore) => ({
    frameworkInstance: { ...fw, complianceScore: undefined },
    complianceScore: fw.complianceScore ?? 0,
  }));

  return (
    <PageLayout header={<PageHeader title="Overview" />}>
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
        findings={scores?.findings ?? []}
      />
    </PageLayout>
  );
}
