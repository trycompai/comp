"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@trycompai/ui/ai-elements/prompt-input";

import type { ChatUIMessage } from "./components/chat/types";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./components/ai-elements/conversation";
import { ChatBreadcrumb } from "./components/chat/ChatBreadcrumb";
import { EmptyState } from "./components/chat/EmptyState";
import { Message } from "./components/chat/message";
import { PanelHeader } from "./components/panels/panels";
import { useChatHandlers } from "./hooks/use-chat-handlers";
import { useTaskAutomation } from "./hooks/use-task-automation";
import { useSharedChatContext } from "./lib/chat-context";
import { useTaskAutomationStore } from "./lib/task-automation-store";

interface Props {
  className: string;
  modelId?: string;
  orgId: string;
  taskId: string;
  taskName?: string;
  automationId: string;
  suggestions?: {
    title: string;
    prompt: string;
    vendorName?: string;
    vendorWebsite?: string;
  }[];
  isLoadingSuggestions?: boolean;
}

function ChatInput({
  validateAndSubmitMessage,
  status,
}: {
  validateAndSubmitMessage: (text: string) => void;
  status: string;
}) {
  const { textInput } = usePromptInputController();

  return (
    <div className="px-4 py-6">
      <PromptInput
        onSubmit={async ({ text }) => {
          validateAndSubmitMessage(text);
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea
            placeholder="Ask me to create an automation..."
            disabled={status === "streaming" || status === "submitted"}
            className="max-h-[400px] min-h-[80px]"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools />
          <PromptInputSubmit
            status={
              status === "streaming" || status === "submitted"
                ? "submitted"
                : undefined
            }
            disabled={
              !textInput.value.trim() ||
              status === "streaming" ||
              status === "submitted"
            }
          />
        </PromptInputFooter>
      </PromptInput>
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
}: {
  hasMessages: boolean;
  scriptUrl?: string;
  messages: ChatUIMessage[];
  orgId: string;
  handleSecretAdded: (secretName: string) => void;
  handleInfoProvided: (info: Record<string, string>) => void;
  validateAndSubmitMessage: (text: string) => void;
  status: string;
  suggestions?: {
    title: string;
    prompt: string;
    vendorName?: string;
    vendorWebsite?: string;
  }[];
  isLoadingSuggestions?: boolean;
}) {
  const { textInput } = usePromptInputController();

  const handleExampleClick = useCallback(
    (prompt: string) => {
      textInput.setInput(prompt);
    },
    [textInput],
  );

  if (!hasMessages) {
    return (
      <div
        className={cn(
          "z-20 flex h-full w-full flex-col px-58",
          scriptUrl && "px-8 pb-4",
        )}
      >
        <EmptyState
          onExampleClick={handleExampleClick}
          status={status}
          onSubmit={() => validateAndSubmitMessage(textInput.value)}
          suggestions={suggestions}
          isLoadingSuggestions={isLoadingSuggestions}
        />
      </div>
    );
  }

  return (
    <div className="relative z-20 flex h-full flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="chat-scrollbar space-y-4">
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
  const initialPrompt = searchParams.get("prompt") || "";
  const { chat, updateAutomationId, automationIdRef } = useSharedChatContext();
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    chat,
  });
  const { setChatStatus, scriptUrl } = useTaskAutomationStore();
  const { automation } = useTaskAutomation();

  // Update shared ref when automation is loaded from hook
  if (automation?.id && automationIdRef.current === "new") {
    automationIdRef.current = automation.id;
  }

  // Ephemeral mode - automation not created yet
  // Check the shared ref, not the URL param
  const isEphemeral = automationIdRef.current === "new";

  const { validateAndSubmitMessage, handleSecretAdded, handleInfoProvided } =
    useChatHandlers({
      sendMessage,
      setInput: () => {}, // Not needed with PromptInputProvider
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
      className={cn(
        className,
        "selection:bg-primary relative selection:text-white",
      )}
      style={{ height: "calc(100vh - 6em)" }}
    >
      <Image
        src="/automation-bg.svg"
        alt="Automation"
        width={538}
        height={561}
        className="pointer-events-none absolute top-0 right-0 z-10 opacity-50"
      />

      <PanelHeader className="relative z-20 shrink-0">
        <div className="flex w-full items-center justify-between">
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
      <PromptInputProvider initialInput={initialPrompt}>
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
        />
      </PromptInputProvider>
    </div>
  );
}
