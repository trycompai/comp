'use client';

import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import {
  Heading,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@trycompai/design-system';
import { CornerDownLeft } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
  suggestions?: { title: string; prompt: string; vendorName?: string; vendorWebsite?: string }[];
  isLoadingSuggestions?: boolean;
}

// Simple text input context for sharing state
interface TextInputContext {
  value: string;
  setInput: (v: string) => void;
}

function ChatInput({
  validateAndSubmitMessage,
  status,
  textInput,
}: {
  validateAndSubmitMessage: (text: string) => void;
  status: string;
  textInput: TextInputContext;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDisabled = status === 'streaming' || status === 'submitted';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!textInput.value.trim() || isDisabled) return;
    validateAndSubmitMessage(textInput.value);
    textInput.setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!textInput.value.trim() || isDisabled) return;
      validateAndSubmitMessage(textInput.value);
      textInput.setInput('');
    }
  };

  const isMac =
    typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div className="py-6 px-4">
      <form onSubmit={handleSubmit}>
        <InputGroup>
          <InputGroupTextarea
            ref={textareaRef}
            placeholder="Ask me to create an automation..."
            disabled={isDisabled}
            value={textInput.value}
            onChange={(e) => textInput.setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
          <InputGroupAddon align="block-end">
            <div className="flex w-full items-center justify-end">
              <InputGroupButton
                type="submit"
                variant="default"
                size="sm"
                disabled={!textInput.value.trim() || isDisabled}
              >
                <span className="flex items-center gap-1 text-xs">
                  {isMac ? '⌘' : 'Ctrl'}
                  <span className="text-[10px]">+</span>
                  <CornerDownLeft className="size-3.5" />
                </span>
              </InputGroupButton>
            </div>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  );
}

function ChatContent({
  hasMessages,
  scriptUrl,
  messages,
  orgId,
  handleSecretAdded,
  handleInfoProvided,
  validateAndSubmitMessage,
  status,
  suggestions,
  isLoadingSuggestions,
  textInput,
}: {
  hasMessages: boolean;
  scriptUrl?: string;
  messages: ChatUIMessage[];
  orgId: string;
  handleSecretAdded: (secretName: string) => void;
  handleInfoProvided: (info: Record<string, string>) => void;
  validateAndSubmitMessage: (text: string) => void;
  status: string;
  suggestions?: { title: string; prompt: string; vendorName?: string; vendorWebsite?: string }[];
  isLoadingSuggestions?: boolean;
  textInput: TextInputContext;
}) {
  const handleExampleClick = useCallback(
    (prompt: string) => {
      textInput.setInput(prompt);
    },
    [textInput],
  );

  if (!hasMessages) {
    return (
      <div className={cn('flex flex-col w-full h-full z-20', scriptUrl && 'px-8 pb-4')}>
        <div className="flex-1 min-h-0 overflow-y-auto h-full z-20">
          <div className="w-full h-full flex flex-col items-center py-48 px-4">
            <div className="w-full max-w-3xl text-center space-y-8 mb-16">
              <Heading as="h2" level="2">
                What evidence do you want to collect?
              </Heading>
              <ChatInput
                validateAndSubmitMessage={validateAndSubmitMessage}
                status={status}
                textInput={textInput}
              />
            </div>

            <EmptyState
              status={status}
              onSubmit={() => validateAndSubmitMessage(textInput.value)}
              onExampleClick={handleExampleClick}
              suggestions={suggestions}
              isLoadingSuggestions={isLoadingSuggestions}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
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

      <ChatInput
        validateAndSubmitMessage={validateAndSubmitMessage}
        status={status}
        textInput={textInput}
      />
    </div>
  );
}

export function Chat({
  className,
  orgId,
  taskId,
  taskName,
  automationId,
  suggestions,
  isLoadingSuggestions = false,
}: Props) {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';
  const { chat, updateAutomationId, automationIdRef } = useSharedChatContext();
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    chat,
  });
  const { setChatStatus, scriptUrl } = useTaskAutomationStore();
  const { automation } = useTaskAutomation();

  // Local text input state
  const [inputValue, setInputValue] = useState(initialPrompt);
  const textInput: TextInputContext = {
    value: inputValue,
    setInput: setInputValue,
  };

  // Update shared ref when automation is loaded from hook
  if (automation?.id && automationIdRef.current === 'new') {
    automationIdRef.current = automation.id;
  }

  // Ephemeral mode - automation not created yet
  // Check the shared ref, not the URL param
  const isEphemeral = automationIdRef.current === 'new';

  const { validateAndSubmitMessage, handleSecretAdded, handleInfoProvided } = useChatHandlers({
    sendMessage,
    setInput: setInputValue,
    orgId,
    taskId,
    automationId: automationIdRef.current,
    isEphemeral,
    updateAutomationId,
  });

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
      <ChatContent
        hasMessages={hasMessages}
        scriptUrl={scriptUrl}
        messages={messages}
        orgId={orgId}
        handleSecretAdded={handleSecretAdded}
        handleInfoProvided={handleInfoProvided}
        validateAndSubmitMessage={validateAndSubmitMessage}
        status={status}
        suggestions={suggestions}
        isLoadingSuggestions={isLoadingSuggestions}
        textInput={textInput}
      />
    </div>
  );
}
