import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SingleTask } from './components/SingleTask';

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string; locale: string }>;
}) {
  const { taskId, orgId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const [task] = await Promise.all([getTask(taskId, session)]);

  if (!task) {
    redirect(`/${orgId}/tasks`);
  }

  const automations = await getAutomations(orgId, session);

  return <SingleTask initialTask={task} initialAutomations={automations} />;
}

const getTask = async (taskId: string, session: Session) => {
  const activeOrgId = session?.session.activeOrganizationId;

  if (!activeOrgId) {
    console.warn('Could not determine active organization ID in getTask');
    return null;
  }

  try {
    const task = await db.task.findUnique({
      where: {
        id: taskId,
        organizationId: activeOrgId,
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

const getAutomations = async (orgId: string, session: Session) => {
  const activeOrgId = orgId ?? session?.session.activeOrganizationId;
  if (!activeOrgId) {
    console.warn('Could not determine active organization ID in getAutomations');
    return [];
  }

  const automations = await db.evidenceAutomation.findMany({
    where: {
      organizationId: activeOrgId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return automations;
};
