import { auth } from '@/utils/auth';
import { db } from '@db';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { Overview } from './components/Overview';
import { getAllFrameworkInstancesWithControls } from './data/getAllFrameworkInstancesWithControls';
import { getFrameworkWithComplianceScores } from './data/getFrameworkWithComplianceScores';
import { getPeopleScore } from './lib/getPeople';
import { getPublishedPoliciesScore } from './lib/getPolicies';
import { getDoneTasks } from './lib/getTasks';

export async function generateMetadata() {
  return {
    title: 'Frameworks',
  };
}

export default async function DashboardPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: organizationId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { onboardingCompleted: true },
  });

  if (org && org.onboardingCompleted === false) {
    redirect(`/onboarding/${organizationId}`);
  }

  // Get onboarding status to check if it's still running
  const onboarding = await db.onboarding.findUnique({
    where: { organizationId },
    select: { triggerJobId: true },
  });

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      deactivated: false,
    },
  });

  const tasks = await getControlTasks();
  const frameworksWithControls = await getAllFrameworkInstancesWithControls({
    organizationId,
  });

  const frameworksWithCompliance = await getFrameworkWithComplianceScores({
    frameworksWithControls,
    tasks,
  });

  const allFrameworks = await db.frameworkEditorFramework.findMany({
    where: {
      visible: true,
    },
  });

  const scores = await getScores();
  const findings = await getOrganizationFindings(organizationId);

  return (
    <PageLayout header={<PageHeader title="Overview" />}>
      <Overview
        frameworksWithControls={frameworksWithControls}
        frameworksWithCompliance={frameworksWithCompliance}
        allFrameworks={allFrameworks}
        organizationId={organizationId}
        publishedPoliciesScore={scores.publishedPoliciesScore}
        doneTasksScore={scores.doneTasksScore}
        peopleScore={scores.peopleScore}
        currentMember={member}
        onboardingTriggerJobId={onboarding?.triggerJobId ?? null}
        findings={findings}
      />
    </PageLayout>
  );
}

const getScores = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return {
      publishedPoliciesScore: {
        totalPolicies: 0,
        publishedPolicies: 0,
        draftPolicies: [],
        policiesInReview: [],
        unpublishedPolicies: [],
      },
      doneTasksScore: {
        totalTasks: 0,
        doneTasks: 0,
        incompleteTasks: [],
      },
      peopleScore: {
        totalMembers: 0,
        completedMembers: 0,
      },
    };
  }

  const publishedPoliciesScore = await getPublishedPoliciesScore(organizationId);
  const doneTasksScore = await getDoneTasks(organizationId);
  const peopleScore = await getPeopleScore(organizationId);

  return {
    publishedPoliciesScore,
    doneTasksScore,
    peopleScore,
  };
});

const getControlTasks = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return [];
  }

  const tasks = await db.task.findMany({
    where: {
      organizationId,
      controls: {
        some: {
          organizationId,
        },
      },
    },
    include: {
      controls: true,
    },
  });

  return tasks;
});

const getOrganizationFindings = cache(async (organizationId: string) => {
  const findings = await db.finding.findMany({
    where: {
      organizationId,
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
        },
      },
      evidenceSubmission: {
        select: {
          id: true,
          formType: true,
        },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return findings;
});
