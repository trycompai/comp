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
  console.log('[TaskPage] Starting page render');
  const { taskId, orgId } = await params;
  console.log('[TaskPage] Params extracted:', { taskId, orgId });
  console.log('[TaskPage] Getting session');
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  console.log('[TaskPage] Session obtained, fetching data');

  const [task, members] = await Promise.all([getTask(taskId, session), getMembers(orgId, session)]);

  if (!task) {
    redirect(`/${orgId}/tasks`);
  }

  return <SingleTask task={task} members={members} />;
}

const getTask = async (taskId: string, session: Session) => {
  console.log('[getTask] Starting task fetch for:', taskId);
  const activeOrgId = session?.session.activeOrganizationId;

  if (!activeOrgId) {
    console.warn('Could not determine active organization ID in getTask');
    return null;
  }

  console.log('[getTask] Querying database for task');
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

    console.log('[getTask] Database query successful');
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
