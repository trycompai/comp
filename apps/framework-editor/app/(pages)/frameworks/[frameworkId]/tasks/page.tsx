import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import type { FrameworkEditorTaskTemplate } from '@/db';
import { redirect } from 'next/navigation';
import { TasksClientPage } from '../../../tasks/TasksClientPage';

interface TaskTemplateWithControls extends FrameworkEditorTaskTemplate {
  controlTemplates?: Array<{ id: string; name: string }>;
}

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  const tasks =
    await serverApi<TaskTemplateWithControls[]>(`/task-template?frameworkId=${frameworkId}`);

  return <TasksClientPage initialTasks={tasks} frameworkId={frameworkId} />;
}
