'use client';

import { useChat } from '@ai-sdk/react';
import { Chat } from '../chat';
import { useSharedChatContext } from '../lib';
import { useTaskAutomationStore } from '../lib/task-automation-store';
import { ChatUIMessage } from './chat/types';
import { TabContent, TabItem } from './tabs';
import { WorkflowVisualizerSimple as WorkflowVisualizer } from './workflow/workflow-visualizer-simple';

interface Props {
  orgId: string;
  taskId: string;
  automationId: string;
  taskName: string;
}

export function AutomationPageClient({ orgId, taskId, automationId, taskName }: Props) {
  const { scriptUrl } = useTaskAutomationStore();
  const { chat } = useSharedChatContext();
  const { messages } = useChat<ChatUIMessage>({ chat });

  const hasMessages = messages.length > 0;

  return (
    <div className="h-full flex flex-col">
      <ul className="flex space-x-5 font-mono text-sm tracking-tight py-2 md:hidden shrink-0">
        <TabItem tabId="chat">Chat</TabItem>
        <TabItem tabId="workflow">Workflow</TabItem>
      </ul>

      {/* Mobile layout tabs taking the whole space*/}
      <div className="flex flex-1 w-full min-h-0 overflow-hidden md:hidden">
        <TabContent tabId="chat" className="flex-1 min-h-0">
          <Chat
            className="h-full"
            orgId={orgId}
            taskId={taskId}
            automationId={automationId}
            taskName={taskName}
          />
        </TabContent>
        <TabContent tabId="workflow" className="flex-1">
          <WorkflowVisualizer className="flex-1 overflow-hidden" />
        </TabContent>
      </div>

      {/* Desktop layout: Chat on left, Workflow on right OR Chat full-screen */}
      <div className="hidden flex-1 w-full min-h-0 overflow-hidden md:flex transition-all duration-500 ease-out">
        <div
          className={`transition-all duration-500 ease-out ${
            scriptUrl || hasMessages ? 'w-1/2' : 'w-full'
          }`}
        >
          <Chat
            className="h-full w-full"
            orgId={orgId}
            taskId={taskId}
            automationId={automationId}
            taskName={taskName}
          />
        </div>

        {/* Workflow panel - slides in from right */}
        <div
          className={`transition-all duration-500 ease-out overflow-hidden ${
            scriptUrl || hasMessages ? 'w-1/2 opacity-100' : 'w-0 opacity-0'
          }`}
        >
          {(scriptUrl || hasMessages) && (
            <div className="w-full h-full ml-2">
              <WorkflowVisualizer className="h-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
