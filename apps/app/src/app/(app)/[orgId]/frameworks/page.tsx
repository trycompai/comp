import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { Overview } from './components/Overview';
import { getAllFrameworkInstancesWithControls } from './data/getAllFrameworkInstancesWithControls';
import { getFrameworkWithComplianceScores } from './data/getFrameworkWithComplianceScores';
import { getPublishedPoliciesScore } from './lib/getPolicies';
import { getDoneTasks } from './lib/getTasks';

export async function generateMetadata() {
  return {
    title: 'Frameworks',
  };
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    redirect('/');
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { onboardingCompleted: true },
  });
  if (org && org.onboardingCompleted === false) {
    redirect(`/onboarding/${organizationId}`);
  }

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

  const publishedPoliciesScore = await getPublishedPoliciesScore(organizationId);
  const doneTasksScore = await getDoneTasks(organizationId);

  return (
    <Overview
      frameworksWithControls={frameworksWithControls}
      frameworksWithCompliance={frameworksWithCompliance}
      allFrameworks={allFrameworks}
      organizationId={organizationId}
      publishedPoliciesScore={publishedPoliciesScore}
      doneTasksScore={doneTasksScore}
    />
  );
}

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
