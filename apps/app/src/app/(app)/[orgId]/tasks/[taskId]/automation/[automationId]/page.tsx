import { db } from '@db';
import { redirect } from 'next/navigation';
import { loadChatHistory } from './actions/task-automation-actions';
import { AutomationLayoutWrapper } from './automation-layout-wrapper';
import { AutomationPageClient } from './components/AutomationPageClient';
import { ChatProvider } from './lib/chat-context';

export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string; automationId: string }>;
}) {
  const { taskId, orgId, automationId } = await params;

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

  // Load chat history server-side (skip for ephemeral 'new' automations)
  let initialMessages = [];
  if (automationId !== 'new') {
    const historyResult = await loadChatHistory(automationId);
    if (historyResult.success && historyResult.data?.messages) {
      initialMessages = historyResult.data.messages;
    }
  }

  return (
    <ChatProvider initialMessages={initialMessages}>
      <AutomationLayoutWrapper>
        <div className="h-screen overflow-hidden">
          <AutomationPageClient
            orgId={orgId}
            taskId={taskId}
            automationId={automationId}
            taskName={taskName}
          />
        </div>
      </AutomationLayoutWrapper>
    </ChatProvider>
  );
}
