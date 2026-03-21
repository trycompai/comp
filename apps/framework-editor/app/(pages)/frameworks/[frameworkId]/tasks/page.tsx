import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { TasksClientPage } from '../../../tasks/TasksClientPage';

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  const tasks = await serverApi<Array<Record<string, unknown>>>(
    `/framework/${frameworkId}/tasks`,
  );

  return (
    <TasksClientPage
      initialTasks={tasks}
      emptyMessage="No tasks linked to this framework yet. Link task templates to controls first."
    />
  );
}
