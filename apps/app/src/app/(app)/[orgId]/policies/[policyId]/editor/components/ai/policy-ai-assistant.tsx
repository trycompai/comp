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
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Alert, Button } from '@trycompai/design-system';
import { Close, MagicWand } from '@trycompai/design-system/icons';
import type { ChatStatus } from 'ai';
import type { PolicyChatUIMessage } from '../../types';

interface PolicyAiAssistantProps {
  messages: PolicyChatUIMessage[];
  status: ChatStatus;
  errorMessage?: string | null;
  sendMessage: (payload: { text: string }) => void;
  close?: () => void;
  hasActiveProposal?: boolean;
}

export function PolicyAiAssistant({
  messages,
  status,
  errorMessage,
  sendMessage,
  close,
  hasActiveProposal,
}: PolicyAiAssistantProps) {
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
        <ConversationContent className="!gap-3 px-3 py-3">
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
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) => {
                    if (part.type === 'text') {
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
                          part={part}
                          hasActiveProposal={hasActiveProposal}
                        />
                      );
                    }

                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
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
            if (!text.trim()) return;
            sendMessage({ text });
          }}
        >
          <PromptInputTextarea placeholder="Let me know what to edit..." />
          <PromptInputFooter>
            <div />
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function PolicyToolCard({
  part,
  hasActiveProposal,
}: {
  part: {
    type: 'tool-proposePolicy';
    state: string;
    input?: {
      title?: string;
      summary?: string;
      detail?: string;
      content?: string;
    };
  };
  hasActiveProposal?: boolean;
}) {
  const toolInput = part.input;
  const isCompleted = part.state === 'output-available';
  const isError = part.state === 'output-error';
  const isWorking = !isCompleted && !isError;

  // Working state: use shimmer
  if (isWorking) {
    const shimmerText = toolInput?.title || 'Working on your policy updates...';
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="relative h-5 w-5 shrink-0">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="absolute inset-0.5 animate-pulse rounded-full bg-primary/40" />
        </div>
        <Shimmer className="text-sm" duration={2.5}>
          {shimmerText}
        </Shimmer>
      </div>
    );
  }

  // Error state: keep alert
  if (isError) {
    return (
      <Alert
        variant="destructive"
        title="Policy update failed"
        description="Something went wrong while generating updates. Please try again."
      />
    );
  }

  // Completed state: subtle success message
  const title = toolInput?.title || toolInput?.summary || 'Policy updates ready';
  const bodyText = toolInput?.detail || (hasActiveProposal
    ? 'Changes are highlighted in the editor.'
    : 'Policy updates were generated.');
  const truncatedBodyText = bodyText.length > 180 ? `${bodyText.slice(0, 177)}…` : bodyText;
  const description = hasActiveProposal
    ? `${truncatedBodyText} Review the highlighted changes in the editor.`
    : truncatedBodyText;

  return (
    <Alert
      variant={hasActiveProposal ? 'success' : 'default'}
      title={title}
      description={description}
    />
  );
}
