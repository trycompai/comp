import { db } from '@db';
import { redirect } from 'next/navigation';
import { AutomationLayoutWrapper } from './automation-layout-wrapper';
import { AutomationPageClient } from './components/AutomationPageClient';

export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string }>;
}) {
  const { taskId, orgId } = await params;

  const task = await db.task.findUnique({
    where: {
      id: taskId,
      organizationId: orgId,
    },
  });

  if (!task) {
    redirect('/tasks');
  }

  const taskName = task.title;

  return (
    <AutomationLayoutWrapper>
      <div className="h-screen overflow-hidden">
        <AutomationPageClient orgId={orgId} taskId={taskId} taskName={taskName} />
      </div>
    </AutomationLayoutWrapper>
  );
}
