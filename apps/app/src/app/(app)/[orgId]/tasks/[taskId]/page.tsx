import { db } from '@db';
import { redirect } from 'next/navigation';
import { SingleTask } from './components/SingleTask';

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string; locale: string }>;
}) {
  const { taskId, orgId } = await params;
  const task = await getTask(orgId, taskId);

  if (!task) {
    redirect(`/${orgId}/tasks`);
  }

  const automations = await getAutomations(orgId, taskId);

  return <SingleTask initialTask={task} initialAutomations={automations} />;
}

const getTask = async (orgId: string, taskId: string) => {
  try {
    const task = await db.task.findUnique({
      where: {
        id: taskId,
        organizationId: orgId,
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

const getAutomations = async (orgId: string, taskId: string) => {
  const automations = await db.evidenceAutomation.findMany({
    where: {
      taskId: taskId,
      task: {
        organizationId: orgId,
      },
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
