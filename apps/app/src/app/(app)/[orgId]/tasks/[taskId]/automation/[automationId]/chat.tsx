'use client';

import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from './components/ai-elements/conversation';
import { ChatBreadcrumb } from './components/chat/ChatBreadcrumb';
import { EmptyState } from './components/chat/EmptyState';
import { Message } from './components/chat/message';
import type { ChatUIMessage } from './components/chat/types';
import { PanelHeader } from './components/panels/panels';
import { Input } from './components/ui/input';
import { useChatHandlers } from './hooks/use-chat-handlers';
import { useTaskAutomation } from './hooks/use-task-automation';
import { useSharedChatContext } from './lib/chat-context';
import { useTaskAutomationStore } from './lib/task-automation-store';

interface Props {
  className: string;
  modelId?: string;
  orgId: string;
  taskId: string;
  taskName?: string;
  automationId: string;
}

export function Chat({ className, orgId, taskId, taskName, automationId }: Props) {
  const [input, setInput] = useState('');
  const { chat, updateAutomationId, automationIdRef } = useSharedChatContext();
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    chat,
  });
  const { setChatStatus, scriptUrl } = useTaskAutomationStore();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { automation } = useTaskAutomation();

  // Update shared ref when automation is loaded from hook
  if (automation?.id && automationIdRef.current === 'new') {
    automationIdRef.current = automation.id;
  }

  // Ephemeral mode - automation not created yet
  // Check the shared ref, not the URL param
  const isEphemeral = automationIdRef.current === 'new';

  const { validateAndSubmitMessage, handleSecretAdded, handleInfoProvided } = useChatHandlers({
    sendMessage,
    setInput,
    orgId,
    taskId,
    automationId: automationIdRef.current,
    isEphemeral,
    updateAutomationId,
  });

  const handleExampleClick = useCallback(
    (prompt: string) => {
      setInput(prompt);
      inputRef.current?.focus();
    },
    [setInput],
  );

  useEffect(() => {
    setChatStatus(status);
  }, [status, setChatStatus]);

  const hasMessages = messages.length > 0;

  return (
    <div
      className={cn(className, 'selection:bg-primary selection:text-white relative')}
      style={{ height: 'calc(100vh - 6em)' }}
    >
      <Image
        src="/automation-bg.svg"
        alt="Automation"
        width={538}
        height={561}
        className="absolute top-0 right-0 z-10 pointer-events-none opacity-50"
      />

      <PanelHeader className="shrink-0 relative z-20">
        <div className="flex items-center justify-between w-full">
          <ChatBreadcrumb
            orgId={orgId}
            taskId={taskId}
            taskName={taskName}
            automationId={automationIdRef.current}
            automationName={automation?.name}
            isEphemeral={isEphemeral}
          />
        </div>
      </PanelHeader>

      {/* Messages Area */}
      {!hasMessages ? (
        <form
          className={cn('flex flex-col w-full h-full px-58 z-20', scriptUrl && 'px-8 pb-4')}
          onSubmit={async (event) => {
            event.preventDefault();
            validateAndSubmitMessage(input);
          }}
        >
          <EmptyState
            input={input}
            onInputChange={setInput}
            onExampleClick={handleExampleClick}
            status={status}
            inputRef={inputRef}
          />
        </form>
      ) : (
        <div className="flex flex-col h-full relative z-20">
          <Conversation className="flex-1 min-h-0">
            <ConversationContent className="space-y-4 chat-scrollbar">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  orgId={orgId}
                  onSecretAdded={handleSecretAdded}
                  onInfoProvided={handleInfoProvided}
                />
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <form
            className="flex py-6 px-4"
            onSubmit={async (event) => {
              event.preventDefault();
              validateAndSubmitMessage(input);
            }}
          >
            <Input
              disabled={status === 'streaming' || status === 'submitted'}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to create an automation..."
              value={input}
            />
          </form>
        </div>
      )}
    </div>
  );
}
