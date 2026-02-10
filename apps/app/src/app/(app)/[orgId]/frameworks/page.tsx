import { serverApi } from '@/lib/api-server';
import { redirect } from 'next/navigation';
import { Overview } from './components/Overview';

export async function generateMetadata() {
  return {
    title: 'Frameworks',
  };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: organizationId } = await params;

  const [frameworksRes, availableRes, scoresRes, findingsRes] =
    await Promise.all([
      serverApi.get<{ data: any[]; count: number }>(
        '/v1/frameworks?includeControls=true&includeScores=true',
      ),
      serverApi.get<{ data: any[]; count: number }>('/v1/frameworks/available'),
      serverApi.get<{
        policies: {
          total: number;
          published: number;
          draftPolicies: any[];
          policiesInReview: any[];
          unpublishedPolicies: any[];
        };
        tasks: { total: number; done: number; incompleteTasks: any[] };
        people: { total: number; completed: number };
        onboardingTriggerJobId: string | null;
        currentMember: { id: string; role: string } | null;
      }>('/v1/frameworks/scores'),
      serverApi.get<{ data: any[] }>('/v1/findings/organization'),
    ]);

  if (!frameworksRes.data || !scoresRes.data) {
    redirect('/login');
  }

  const frameworksWithControls = frameworksRes.data.data ?? [];
  const allFrameworks = availableRes.data?.data ?? [];
  const scores = scoresRes.data;
  const findings = findingsRes.data?.data ?? [];

  // Transform API response to match component interfaces
  const frameworksWithCompliance = frameworksWithControls.map((fw: any) => ({
    frameworkInstance: fw,
    complianceScore: fw.complianceScore ?? 0,
  }));

  return (
    <Overview
      frameworksWithControls={frameworksWithControls}
      frameworksWithCompliance={frameworksWithCompliance}
      allFrameworks={allFrameworks}
      organizationId={organizationId}
      publishedPoliciesScore={{
        totalPolicies: scores.policies.total,
        publishedPolicies: scores.policies.published,
        draftPolicies: scores.policies.draftPolicies,
        policiesInReview: scores.policies.policiesInReview,
        unpublishedPolicies: scores.policies.unpublishedPolicies,
      }}
      doneTasksScore={{
        totalTasks: scores.tasks.total,
        doneTasks: scores.tasks.done,
        incompleteTasks: scores.tasks.incompleteTasks,
      }}
      peopleScore={{
        totalMembers: scores.people.total,
        completedMembers: scores.people.completed,
      }}
      currentMember={scores.currentMember}
      onboardingTriggerJobId={scores.onboardingTriggerJobId}
      findings={findings}
    />
  );
}
