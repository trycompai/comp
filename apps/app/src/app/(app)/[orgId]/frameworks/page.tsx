import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
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

export default async function DashboardPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: organizationId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const member = await db.member.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  const tasks = await getControlTasks(organizationId);
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
      currentMember={member}
    />
  );
}

const getControlTasks = cache(async (organizationId: string) => {
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
