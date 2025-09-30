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

  const [task, members] = await Promise.all([getTask(taskId, session), getMembers(orgId, session)]);

  if (!task) {
    redirect(`/${orgId}/tasks`);
  }

  return <SingleTask task={task} members={members} />;
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

const getMembers = async (orgId: string, session: Session) => {
  const activeOrgId = orgId ?? session?.session.activeOrganizationId;
  if (!activeOrgId) {
    console.warn('Could not determine active organization ID in getMembers');
    return [];
  }

  const members = await db.member.findMany({
    where: {
      organizationId: activeOrgId,
      role: {
        notIn: ['employee'],
      },
    },
    include: { user: true },
  });
  return members;
};
