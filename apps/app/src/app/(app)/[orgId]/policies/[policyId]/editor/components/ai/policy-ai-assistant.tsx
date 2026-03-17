'use client';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import { Button } from '@trycompai/design-system';
import { Close, MagicWand } from '@trycompai/design-system/icons';
import type { ChatStatus } from 'ai';
import type { PolicyChatUIMessage } from '../../types';

interface PolicyAiAssistantProps {
  messages: PolicyChatUIMessage[];
  status: ChatStatus;
  errorMessage?: string | null;
  sendMessage: (payload: { text: string }) => void;
  stop?: () => void;
  close?: () => void;
}

export function PolicyAiAssistant({
  messages,
  status,
  errorMessage,
  sendMessage,
  stop,
  close,
}: PolicyAiAssistantProps) {
  const isBusy = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      {close && (
        <div className="flex items-center justify-between bg-primary px-3 py-2 text-primary-foreground">
          <span className="text-sm font-semibold">AI Assistant</span>
          <div className="text-primary-foreground [&_button]:text-primary-foreground/70 [&_button:hover]:text-primary-foreground">
            <Button variant="ghost" size="icon" onClick={close} iconLeft={<Close size={14} />} />
          </div>
        </div>
      )}

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="!gap-4 px-3 py-3">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="text-muted-foreground">
                <MagicWand size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Policy AI Assistant</h3>
                <p className="text-xs text-muted-foreground">I can help you edit, adapt, or check this policy for compliance.</p>
              </div>
              <div className="space-y-0.5 text-center text-xs italic text-muted-foreground/70">
                <p>&quot;Add a section covering third-party vendor access controls.&quot;</p>
                <p>&quot;Update the incident response steps to align with SOC 2.&quot;</p>
                <p>&quot;Rewrite the data retention clause for GDPR compliance.&quot;</p>
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {messages.map((message, messageIndex) => {
                // A tool in an older message that never completed was interrupted.
                // A tool in the latest message is only interrupted if we're no longer busy.
                const isLastMessage = messageIndex === messages.length - 1;
                const isMessageStopped = isLastMessage ? !isBusy : true;

                return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, index) => {
                      if (part.type === 'text') {
                        if (message.role === 'user') {
                          return (
                            <div key={`${message.id}-${index}`} className="flex justify-end">
                              <div className="rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                                {part.text}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <MessageResponse key={`${message.id}-${index}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      }

                      if (part.type === 'tool-proposePolicy') {
                        return (
                          <PolicyToolCard
                            key={`${message.id}-${index}`}
                            state={part.state}
                            stopped={isMessageStopped}
                          />
                        );
                      }

                      if (
                        part.type === 'tool-listVendors' ||
                        part.type === 'tool-getVendor' ||
                        part.type === 'tool-listPolicies' ||
                        part.type === 'tool-getPolicy' ||
                        part.type === 'tool-listEvidence'
                      ) {
                        return (
                          <DataToolCard
                            key={`${message.id}-${index}`}
                            toolName={part.type}
                            state={part.state}
                            stopped={isMessageStopped}
                          />
                        );
                      }

                      return null;
                    })}
                  </MessageContent>
                </Message>
                );
              })}
              <ThinkingIndicator status={status} messages={messages} />
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t px-3 py-2">
        {errorMessage && (
          <div className="mb-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        <PromptInput
          onSubmit={({ text }) => {
            if (!text.trim() || isBusy) return;
            sendMessage({ text });
          }}
        >
          <PromptInputTextarea placeholder="Let me know what to edit..." disabled={isBusy} className="min-h-[2rem] max-h-[4rem]" />
          <PromptInputFooter>
            <div />
            {isBusy && stop ? (
              <Button
                variant="outline"
                size="sm"
                onClick={stop}
              >
                Stop
              </Button>
            ) : (
              <PromptInputSubmit status={status} />
            )}
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function PolicyToolCard({
  state,
  stopped,
}: {
  state: string;
  stopped: boolean;
}) {
  const isCompleted = state === 'output-available';
  const isError = state === 'output-error';
  const isWorking = !isCompleted && !isError;

  // Interrupted — streaming stopped while tool was in progress
  if (isWorking && stopped) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <span>Interrupted</span>
      </div>
    );
  }

  // Working state: same compact style as data tool cards
  if (isWorking) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <svg
          className="h-3 w-3 shrink-0 animate-spin text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span>Updating policy…</span>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Something went wrong while generating updates. Please try again.
      </p>
    );
  }

  // Completed state: the AI's text response already explains the changes,
  // so just show a minimal checkmark — no redundant alert banner.
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
      <svg className="h-3 w-3 text-primary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <span>Policy updated</span>
    </div>
  );
}

const TOOL_LABELS: Record<string, { loading: string; done: string }> = {
  'tool-listVendors': { loading: 'Fetching vendors', done: 'Fetched vendors' },
  'tool-getVendor': { loading: 'Looking up vendor details', done: 'Looked up vendor details' },
  'tool-listPolicies': { loading: 'Fetching policies', done: 'Fetched policies' },
  'tool-getPolicy': { loading: 'Reading policy content', done: 'Read policy content' },
  'tool-listEvidence': { loading: 'Fetching evidence', done: 'Fetched evidence' },
};

function DataToolCard({
  toolName,
  state,
  stopped,
}: {
  toolName: string;
  state: string;
  stopped: boolean;
}) {
  const isComplete = state === 'output-available';
  const labels = TOOL_LABELS[toolName] ?? { loading: 'Fetching data', done: 'Fetched data' };

  // Once complete, show a compact done state
  if (isComplete) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <svg className="h-3 w-3 text-primary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span>{labels.done}</span>
      </div>
    );
  }

  // Interrupted
  if (stopped) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <span>{labels.done}</span>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <svg
        className="h-3 w-3 shrink-0 animate-spin text-primary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span>{labels.loading}…</span>
    </div>
  );
}

function ThinkingIndicator({
  status,
  messages,
}: {
  status: ChatStatus;
  messages: PolicyChatUIMessage[];
}) {
  // Show when streaming/submitted but the last message is still the user's
  // (AI hasn't started responding yet), or the AI message has no visible parts
  if (status !== 'streaming' && status !== 'submitted') return null;

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return null;

  // If the last message is from the user, AI hasn't started yet
  // If it's from the assistant but has no parts, it's still thinking
  const isThinking =
    lastMessage.role === 'user' ||
    (lastMessage.role === 'assistant' && lastMessage.parts.length === 0);

  if (!isThinking) return null;

  return (
    <div className="flex items-center gap-1.5 py-1">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
      </div>
    </div>
  );
}
