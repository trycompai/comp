'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@comp/ui/ai-elements/conversation';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@comp/ui/ai-elements/prompt-input';
import { Tool, ToolHeader } from '@comp/ui/ai-elements/tool';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import type { ChatStatus } from 'ai';
import {
  ArrowDownIcon,
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  X,
  XCircleIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { PolicyChatUIMessage } from '../../types';

interface PolicyAiAssistantProps {
  messages: PolicyChatUIMessage[];
  status: ChatStatus;
  errorMessage?: string | null;
  sendMessage: (payload: { text: string }) => void;
  close?: () => void;
  onScrollToDiff?: () => void;
  hasActiveProposal?: boolean;
}

export function PolicyAiAssistant({
  messages,
  status,
  errorMessage,
  sendMessage,
  close,
  onScrollToDiff,
  hasActiveProposal,
}: PolicyAiAssistantProps) {
  const [input, setInput] = useState('');

  const isLoading = status === 'streaming' || status === 'submitted';

  const hasActiveTool = messages.some(
    (m) =>
      m.role === 'assistant' &&
      m.parts.some(
        (p) =>
          p.type === 'tool-proposePolicy' &&
          (p.state === 'input-streaming' ||
            p.state === 'output-available' ||
            p.state === 'output-error'),
      ),
  );

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">AI Assistant</span>
        {close && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Conversation className="min-h-0" aria-label="Policy AI assistant conversation">
        <ConversationContent className="gap-3 p-3">
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              <p>
                I can help you edit, adapt, or check this policy for compliance. Try asking me
                things like:
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>"Adapt this for a fully remote, distributed team."</li>
                <li>
                  "Can I shorten the data retention timeframe and still meet SOC 2 standards?"
                </li>
                <li>"Modify the access control section to include contractors."</li>
              </ul>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'text-sm',
                  message.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-lg bg-secondary px-3 py-2'
                    : 'text-foreground',
                )}
              >
                {message.parts.map((part, index) => {
                  if (part.type === 'text') {
                    return (
                      <div key={`${message.id}-${index}`} className="whitespace-pre-wrap">
                        {part.text}
                      </div>
                    );
                  }

                  if (part.type === 'tool-proposePolicy') {
                    const toolInput = part.input;

                    const isInProgress =
                      part.state === 'input-streaming' || part.state === 'input-available';
                    const isCompleted = part.state === 'output-available';

                    const title =
                      (isCompleted
                        ? toolInput?.title || toolInput?.summary
                        : toolInput?.title || 'Configuring policy updates') ||
                      'Policy updates ready for your review';

                    const bodyText = (() => {
                      if (isInProgress) {
                        return (
                          toolInput?.detail ||
                          'I am preparing an updated version of this policy. Please wait a moment before accepting any changes.'
                        );
                      }
                      if (isCompleted) {
                        return (
                          toolInput?.detail ||
                          'The updated policy is ready. Review the diff in the editor before applying changes.'
                        );
                      }
                      return (
                        toolInput?.detail ||
                        'Review the proposed changes in the editor preview below before applying them.'
                      );
                    })();

                    const truncatedBodyText =
                      bodyText.length > 180 ? `${bodyText.slice(0, 177)}…` : bodyText;

                    type ToolState = typeof part.state;
                    const statusPill = (() => {
                      const labels: Record<ToolState, string> = {
                        'input-streaming': 'Drafting',
                        'input-available': 'Running',
                        'output-available': 'Completed',
                        'output-error': 'Error',
                      };

                      const icons: Record<ToolState, React.ReactNode> = {
                        'input-streaming': <CircleIcon className="size-3" />,
                        'input-available': <ClockIcon className="size-3 animate-pulse" />,
                        'output-available': <CheckCircleIcon className="size-3 text-emerald-600" />,
                        'output-error': <XCircleIcon className="size-3 text-red-600" />,
                      };

                      return (
                        <Badge
                          className="gap-1.5 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
                          variant="secondary"
                        >
                          {icons[part.state]}
                          {labels[part.state]}
                        </Badge>
                      );
                    })();

                    return (
                      <Tool key={`${message.id}-${index}`} className="mt-2">
                        <ToolHeader
                          title={title}
                          meta={statusPill}
                          onClick={isCompleted && onScrollToDiff ? onScrollToDiff : undefined}
                          className={
                            isCompleted && onScrollToDiff
                              ? 'cursor-pointer hover:bg-muted/50'
                              : undefined
                          }
                        />
                        <p className="px-3 py-2 text-[10px] text-muted-foreground">
                          {truncatedBodyText}
                          {hasActiveProposal && onScrollToDiff && (
                            <button
                              type="button"
                              onClick={onScrollToDiff}
                              className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                            >
                              <ArrowDownIcon className="size-3" />
                              View proposed changes
                            </button>
                          )}
                        </p>
                      </Tool>
                    );
                  }

                  return null;
                })}
              </div>
            ))
          )}
          {isLoading && !hasActiveTool && (
            <div className="text-sm text-muted-foreground">Thinking...</div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {errorMessage && (
        <div className="border-t bg-destructive/10 px-3 py-2">
          <p className="text-xs text-destructive">{errorMessage}</p>
        </div>
      )}

      <div className="border-t p-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this policy..."
          />
          <PromptInputFooter>
            <PromptInputSubmit disabled={isLoading || !input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
