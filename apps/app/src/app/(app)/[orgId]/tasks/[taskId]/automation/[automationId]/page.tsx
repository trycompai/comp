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
      // Deduplicate messages by ID (in case of concurrent save/load race conditions)
      const seen = new Set();
      initialMessages = historyResult.data.messages.filter((msg: any) => {
        if (seen.has(msg.id)) {
          return false;
        }
        seen.add(msg.id);
        return true;
      });
    }
  }

  // Pass task info for client-side suggestion loading (non-blocking)
  const taskDescription = task.description || task.title;

  return (
    <ChatProvider initialMessages={initialMessages}>
      <AutomationLayoutWrapper>
        <div className="h-screen overflow-hidden">
          <AutomationPageClient
            orgId={orgId}
            taskId={taskId}
            automationId={automationId}
            taskName={taskName}
            taskDescription={automationId === 'new' ? taskDescription : undefined}
          />
        </div>
      </AutomationLayoutWrapper>
    </ChatProvider>
  );
}
