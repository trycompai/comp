'use client';

import { useSession } from '@/utils/auth-client';
import { useChat } from '@ai-sdk/react';
import { Button } from '@comp/ui/button';
import { ScrollArea } from '@comp/ui/scroll-area';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import type { UIMessage } from 'ai';
import { useActiveOrganization } from '@/utils/auth-client';
import { apiClient } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChatEmpty } from './chat-empty';
import { ChatTextarea } from './chat-text-area';
import { Messages } from './messages';

type AssistantStoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
};

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

  // Best practice: prefer org from URL params (deterministic). Fallback only when assistant is used outside org routes.
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

  const { messages, sendMessage, error, status, stop, setMessages } = useChat({
    id:
      resolvedOrganizationId && userId
        ? `assistant-chat:v1:${resolvedOrganizationId}:${userId}`
        : undefined,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: resolvedOrganizationId ? { 'X-Organization-Id': resolvedOrganizationId } : undefined,
    }),

    // Automatically submit when all server-side tool calls are complete
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  if (error) return <div>{error.message}</div>;

  // Hydrate chat messages from server-side (Redis-backed) history.
  useEffect(() => {
    if (!userId || !resolvedOrganizationId) return;

    isHydratingRef.current = true;

    // Clear current messages immediately so we never show cross-org history while loading.
    setMessages([]);

    const controller = new AbortController();
    const orgIdAtStart = resolvedOrganizationId;

    void (async () => {
      const res = await apiClient.get<{ messages: AssistantStoredMessage[] }>(
        '/v1/assistant-chat/history',
        resolvedOrganizationId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      );

      if (res.error || res.status !== 200) {
        console.error('[assistant-chat] Failed to load history', {
          status: res.status,
          error: res.error,
        });
      }

      // If the org changed while we were loading, ignore this result.
      if (resolvedOrganizationIdRef.current !== orgIdAtStart) {
        isHydratingRef.current = false;
        return;
      }

      const stored = res.data?.messages ?? [];
      latestSnapshotRef.current = { organizationId: orgIdAtStart, messages: stored };
      lastSavedJsonRef.current = JSON.stringify(stored);

      const uiMessages: UIMessage[] = stored.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: 'text', text: m.text }],
      }));

      setMessages(uiMessages);
      isHydratingRef.current = false;
    })();

    return () => {
      controller.abort();
    };
  }, [resolvedOrganizationId, setMessages, userId]);

  useEffect(() => {
    if (!resolvedOrganizationId || !userId) return;
    if (isHydratingRef.current) return;

    const isStorableRole = (role: UIMessage['role']): role is 'user' | 'assistant' => {
      return role === 'user' || role === 'assistant';
    };

    // Persist only user + assistant text for stability and forward-compatibility.
    const storedMessages: AssistantStoredMessage[] = messages
      .filter((m): m is UIMessage & { role: 'user' | 'assistant' } => isStorableRole(m.role))
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
          role: m.role,
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

    // Debounce while streaming; save immediately once ready.
    const delayMs = isLoading ? 300 : 0;
    const timeout = window.setTimeout(() => {
      void apiClient.call(
        '/v1/assistant-chat/history',
        {
          method: 'PUT',
          body: JSON.stringify({ messages: storedMessages }),
          organizationId: resolvedOrganizationId,
        },
        true,
      );
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [isLoading, messages, resolvedOrganizationId, userId]);

  // Flush the latest history snapshot on unmount so closing the sheet can't cancel the last save.
  useEffect(() => {
    if (!resolvedOrganizationId || !userId) return;

    return () => {
      const snapshot = latestSnapshotRef.current;
      if (!snapshot || snapshot.messages.length === 0) return;

      // IMPORTANT: Always flush using the orgId that the snapshot was created for,
      // not the orgId captured by this effect's closure (prevents cross-org mixups).
      void apiClient.call(
        '/v1/assistant-chat/history',
        {
          method: 'PUT',
          body: JSON.stringify({ messages: snapshot.messages }),
          organizationId: snapshot.organizationId,
          keepalive: true,
        },
        false,
      );
    };
  }, [resolvedOrganizationId, userId]);

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
            void apiClient.delete('/v1/assistant-chat/history', resolvedOrganizationId);
            setMessages([]);
            setInput('');
          }}
        >
          Clear chat
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-100px)]">
        {messages.length === 0 ? (
          <div className="mx-auto w-full max-w-xl">
            <ChatEmpty firstName={session?.user?.name?.split(' ').at(0) ?? ''} />
          </div>
        ) : (
          <Messages messages={messages} isLoading={isLoading} status={status} />
        )}
      </ScrollArea>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
      >
        <ChatTextarea
          handleInputChange={(e) => setInput(e.target.value)}
          input={input}
          isLoading={isLoading}
          status={status}
          stop={stop}
        />
      </form>
    </div>
  );
}
