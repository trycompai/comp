import { db } from '@db';
import { redirect } from 'next/navigation';
import { AutomationOverview } from './components/AutomationOverview';

export default async function AutomationOverviewPage({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string; automationId: string }>;
}) {
  const { taskId, orgId, automationId } = await params;

  const task = await getTask(taskId);
  if (!task) {
    redirect(`/${orgId}/tasks`);
  }

  const automation = await getAutomation(automationId);
  if (!automation) {
    redirect(`/${orgId}/tasks/${taskId}`);
  }

  const runs = await getAutomationRuns(automationId);

  return <AutomationOverview task={task} automation={automation} initialRuns={runs} />;
}

const getTask = async (taskId: string) => {
  try {
    const task = await db.task.findUnique({
      where: {
        id: taskId,
      },
    });

    return task;
  } catch (error) {
    console.error('[getTask] Database query failed:', error);
    throw error;
  }
};

const getAutomation = async (automationId: string) => {
  try {
    const automation = await db.evidenceAutomation.findUnique({
      where: {
        id: automationId,
      },
    });

    return automation;
  } catch (error) {
    console.error('[getAutomation] Database query failed:', error);
    throw error;
  }
};

const getAutomationRuns = async (automationId: string) => {
  const runs = await db.evidenceAutomationRun.findMany({
    where: {
      evidenceAutomationId: automationId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return runs;
};
