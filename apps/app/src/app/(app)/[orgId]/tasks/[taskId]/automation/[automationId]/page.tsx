import { db } from '@db';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
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

  // Check if enterprise API is configured
  if (!process.env.ENTERPRISE_API_SECRET) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full mx-auto p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
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
            <ArrowLeft className="w-4 h-4" />
            Back to task
          </Link>
        </div>
      </div>
    );
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
