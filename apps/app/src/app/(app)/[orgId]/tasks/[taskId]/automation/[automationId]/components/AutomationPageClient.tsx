'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { generateAutomationSuggestions } from '../actions/generate-suggestions';
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
  taskDescription?: string;
}

export function AutomationPageClient({
  orgId,
  taskId,
  automationId,
  taskName,
  taskDescription,
}: Props) {
  const { scriptUrl } = useTaskAutomationStore();
  const { chat } = useSharedChatContext();
  const { messages } = useChat<ChatUIMessage>({ chat });
  const [suggestions, setSuggestions] = useState<
    {
      title: string;
      prompt: string;
      vendorName?: string;
      vendorWebsite?: string;
    }[]
  >([]);
  // Initialize loading state to true for new automations to show skeletons immediately
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(
    automationId === 'new' && !!taskDescription,
  );

  // Load suggestions asynchronously (non-blocking - page renders immediately)
  useEffect(() => {
    if (automationId === 'new' && taskDescription) {
      setIsLoadingSuggestions(true);
      const clientStartTime = performance.now();
      generateAutomationSuggestions(taskDescription, orgId)
        .then((result) => {
          const clientReceiveTime = performance.now();
          console.log(
            `[AutomationPageClient] Received suggestions in ${(clientReceiveTime - clientStartTime).toFixed(2)}ms`,
          );
          // Use flushSync to force immediate re-render
          flushSync(() => {
            setSuggestions(result);
            setIsLoadingSuggestions(false);
          });
          const clientUpdateTime = performance.now();
          console.log(
            `[AutomationPageClient] State updated and flushed in ${(clientUpdateTime - clientReceiveTime).toFixed(2)}ms`,
          );
        })
        .catch((error) => {
          console.error('Failed to generate suggestions:', error);
          setIsLoadingSuggestions(false);
          // Keep empty array, will use static suggestions
        });
    } else {
      // Not a new automation, no need to load suggestions
      setIsLoadingSuggestions(false);
    }
  }, [automationId, taskDescription, orgId]);

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
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
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
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
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
