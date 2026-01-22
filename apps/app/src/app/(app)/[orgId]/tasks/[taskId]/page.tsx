import { getFeatureFlags } from '@/app/posthog';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SingleTask } from './components/SingleTask';

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string; locale: string }>;
}) {
  const { taskId, orgId } = await params;
  const task = await getTask(taskId);

  if (!task) {
    redirect(`/${orgId}/tasks`);
  }

  const automations = await getAutomations(taskId);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  let isWebAutomationsEnabled = false;
  if (session?.user?.id) {
    const flags = await getFeatureFlags(session.user.id);
    isWebAutomationsEnabled =
      flags['is-web-automations-enabled'] === true ||
      flags['is-web-automations-enabled'] === 'true';
  }

  return (
    <SingleTask
      initialTask={task}
      initialAutomations={automations}
      isWebAutomationsEnabled={isWebAutomationsEnabled}
    />
  );
}

const getTask = async (taskId: string) => {
  if (!taskId) {
    console.warn('Could not determine active organization ID in getTask');
    return null;
  }

  try {
    const task = await db.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        controls: true,
      },
    });

    return task;
  } catch (error) {
    console.error('[getTask] Database query failed:', error);
    throw error;
  }
};

const getAutomations = async (taskId: string) => {
  if (!taskId) {
    console.warn('Could not determine task ID in getAutomations');
    return [];
  }

  const automations = await db.evidenceAutomation.findMany({
    where: {
      taskId: taskId,
    },
    include: {
      runs: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return automations;
};
