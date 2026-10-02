import { db } from '@db/server';
import { ArrowLeft, Locked } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { deduplicateChatHistory } from './actions/automation-chat-history';
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

  // Check if enterprise API is configured
  if (!process.env.ENTERPRISE_API_SECRET) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full mx-auto p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Locked size={24} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Enterprise Feature</h2>
          <p className="text-sm text-muted-foreground">
            Task automations require an enterprise license. Contact{' '}
            <a
              href="mailto:sales@trycomp.ai"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              sales@trycomp.ai
            </a>{' '}
            to learn more about enabling this feature.
          </p>
          <Link
            href={`/${orgId}/tasks/${taskId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            <ArrowLeft size={16} />
            Back to task
          </Link>
        </div>
      </div>
    );
  }

  const taskName = task.title;

  // Load chat history server-side (skip for ephemeral 'new' automations)
  let initialMessages: unknown[] = [];
  if (automationId !== 'new') {
    const historyResult = await loadChatHistory(automationId);
    if (historyResult.success) {
      initialMessages = deduplicateChatHistory(historyResult.data.messages);
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
