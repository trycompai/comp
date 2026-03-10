'use client';

import { env } from '@/env.mjs';
import { useSession } from '@/utils/auth-client';
import { useChat } from '@ai-sdk/react';
import { Button } from '@comp/ui/button';
import {
  DefaultChatTransport,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import type { UIMessage } from 'ai';
import { useActiveOrganization } from '@/utils/auth-client';
import { apiClient } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import { Fragment, useEffect, useRef, useState } from 'react';
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
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Tool, ToolHeader, ToolContent } from '@/components/ai-elements/tool';
import { LogoSpinner } from '../logo-spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';

const API_URL = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type AssistantStoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
};

function MessageParts({
  message,
  isLastMessage,
  isStreaming,
}: {
  message: UIMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
}) {
  const reasoningParts = message.parts.filter((p) => p.type === 'reasoning');
  const reasoningText = reasoningParts.map((p) => p.text).join('\n\n');
  const hasReasoning = reasoningParts.length > 0;
  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    isLastMessage && isStreaming && lastPart?.type === 'reasoning';

  return (
    <>
      {hasReasoning && (
        <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      )}
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          return (
            <MessageResponse key={`${message.id}-${i}`}>
              {part.text}
            </MessageResponse>
          );
        }
        if (isToolUIPart(part)) {
          if (part.state === 'output-available') return null;
          const toolType = part.type as `tool-${string}`;
          return (
            <Tool key={`${message.id}-tool-${i}`}>
              <ToolHeader
                type={toolType}
                state={part.state as "input-streaming" | "input-available" | "output-available" | "output-error"}
              />
              <ToolContent />
            </Tool>
          );
        }
        return null;
      })}
    </>
  );
}

export default function Chat() {
  const { data: session } = useSession();
  const { data: activeOrganization } = useActiveOrganization();
  const params = useParams();

  const [input, setInput] = useState('');

  const userId = session?.user?.id;
  const orgIdFromUrl =
    typeof params?.orgId === 'string'
      ? params.orgId
      : Array.isArray(params?.orgId)
        ? params.orgId[0]
        : undefined;

  const resolvedOrganizationId = orgIdFromUrl ?? activeOrganization?.id;

  const lastSavedJsonRef = useRef<string>('');
  const isHydratingRef = useRef<boolean>(false);
  const latestSnapshotRef = useRef<{
    organizationId: string;
    messages: AssistantStoredMessage[];
  } | null>(null);
  const resolvedOrganizationIdRef = useRef<string | undefined>(resolvedOrganizationId);

  useEffect(() => {
    resolvedOrganizationIdRef.current = resolvedOrganizationId;
  }, [resolvedOrganizationId]);

  const transport = new DefaultChatTransport({
    api: `${API_URL}/v1/assistant-chat/completions`,
    credentials: 'include',
  });

  const { messages, sendMessage, error, status, stop, setMessages } = useChat({
    id:
      resolvedOrganizationId && userId
        ? `assistant-chat:v1:${resolvedOrganizationId}:${userId}`
        : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: transport as any,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Hydrate chat messages from server-side (Redis-backed) history.
  useEffect(() => {
    if (!userId || !resolvedOrganizationId) return;

    isHydratingRef.current = true;
    setMessages([]);

    const controller = new AbortController();
    const orgIdAtStart = resolvedOrganizationId;

    void (async () => {
      const res = await apiClient.get<{ messages: AssistantStoredMessage[] }>(
        '/v1/assistant-chat/history',
      );

      if (res.error || res.status !== 200) {
        console.error('[assistant-chat] Failed to load history', {
          status: res.status,
          error: res.error,
        });
      }

      if (resolvedOrganizationIdRef.current !== orgIdAtStart) {
        isHydratingRef.current = false;
        return;
      }

      const stored = res.data?.messages ?? [];
      latestSnapshotRef.current = { organizationId: orgIdAtStart, messages: stored };
      lastSavedJsonRef.current = JSON.stringify(stored);

      const uiMessages = stored.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: 'text' as const, text: m.text }],
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessages(uiMessages as any);
      isHydratingRef.current = false;
    })();

    return () => {
      controller.abort();
    };
  }, [resolvedOrganizationId, setMessages, userId]);

  useEffect(() => {
    if (!resolvedOrganizationId || !userId) return;
    if (isHydratingRef.current) return;

    const storedMessages: AssistantStoredMessage[] = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => {
        const text = (m.parts ?? [])
          .map((part) => {
            if (!part || typeof part !== 'object') return '';
            if (!('type' in part)) return '';
            if (part.type !== 'text') return '';
            if (!('text' in part) || typeof part.text !== 'string') return '';
            return part.text;
          })
          .filter(Boolean)
          .join('\n\n');

        return {
          id: m.id,
          role: m.role as 'user' | 'assistant',
          text,
          createdAt: Date.now(),
        };
      })
      .filter((m) => m.text.trim().length > 0);

    const json = JSON.stringify(storedMessages);
    if (json === lastSavedJsonRef.current) return;
    lastSavedJsonRef.current = json;
    if (resolvedOrganizationId) {
      latestSnapshotRef.current = {
        organizationId: resolvedOrganizationId,
        messages: storedMessages,
      };
    }

    const delayMs = isLoading ? 300 : 0;
    const timeout = window.setTimeout(() => {
      void apiClient.call(
        '/v1/assistant-chat/history',
        {
          method: 'PUT',
          body: JSON.stringify({ messages: storedMessages }),
        },
      );
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [isLoading, messages, resolvedOrganizationId, userId]);

  // Flush the latest history snapshot on unmount.
  useEffect(() => {
    if (!resolvedOrganizationId || !userId) return;

    return () => {
      const snapshot = latestSnapshotRef.current;
      if (!snapshot || snapshot.messages.length === 0) return;

      void apiClient.call(
        '/v1/assistant-chat/history',
        {
          method: 'PUT',
          body: JSON.stringify({ messages: snapshot.messages }),
          keepalive: true,
        },
      );
    };
  }, [resolvedOrganizationId, userId]);

  const isStreaming = status === 'streaming';

  return (
    <div className="relative flex h-full flex-col">
      <div className="mx-auto flex w-full max-w-xl items-center justify-end gap-2 px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading || messages.length === 0 || !resolvedOrganizationId || !userId}
          onClick={() => {
            if (!resolvedOrganizationId || !userId) return;
            void apiClient.delete('/v1/assistant-chat/history');
            setMessages([]);
            setInput('');
          }}
        >
          Clear chat
        </Button>
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-xl !gap-6">
          {error && (
            <div className="px-4 py-2">
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
              </div>
            </div>
          )}
          {messages.length === 0 && !error ? (
            <ConversationEmptyState
              icon={<LogoSpinner />}
              title={`Hi ${session?.user?.name?.split(' ').at(0) ?? ''}, how can I help you today?`}
            />
          ) : (
            messages.map((message, index) => (
              <Message from={message.role} key={message.id}>
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5">
                      <MessageContent>
                        <MessageParts
                          message={message}
                          isLastMessage={index === messages.length - 1}
                          isStreaming={isStreaming}
                        />
                      </MessageContent>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center text-foreground">
                        <LogoSpinner size={16} isDisabled={false} />
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        Comp AI
                      </span>
                    </div>
                    <MessageContent className="pl-7">
                      <MessageParts
                        message={message}
                        isLastMessage={index === messages.length - 1}
                        isStreaming={isStreaming}
                      />
                    </MessageContent>
                  </>
                )}
              </Message>
            ))
          )}
          {status === 'submitted' && <LogoSpinner />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <form
        className="mx-auto w-full max-w-xl px-4 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
      >
        <div className="relative">
          <textarea
            className="mb-2 h-12 min-h-12 w-full resize-none rounded-md border bg-background px-3 pt-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={input}
            autoFocus
            placeholder="Ask Comp AI something..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  const form = (e.target as HTMLElement).closest('form');
                  if (form) form.requestSubmit();
                }
              }
            }}
          />
        </div>
      </form>
    </div>
  );
}
