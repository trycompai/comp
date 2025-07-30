import { TaskOverview } from '@/components/risks/tasks/task-overview';
import { getUsers } from '@/hooks/use-users';
import { auth } from '@/utils/auth';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
interface PageProps {
  params: Promise<{ riskId: string; taskId: string }>;
}

export default async function RiskPage({ params }: PageProps) {
  const { riskId, taskId } = await params;
  const task = await getTask(riskId, taskId);
  const users = await getUsers();

  if (!task) {
    redirect('/');
  }

  return (
    <div className="flex flex-col gap-4">
      <TaskOverview task={task} users={users} />
    </div>
  );
}

const getTask = cache(async (riskId: string, taskId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    redirect('/');
  }

  const task = await db.task.findUnique({
    where: {
      id: taskId,
      organizationId: session.session.activeOrganizationId,
    },
    include: {
      assignee: true,
    },
  });

  return task;
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Task Overview',
  };
}
