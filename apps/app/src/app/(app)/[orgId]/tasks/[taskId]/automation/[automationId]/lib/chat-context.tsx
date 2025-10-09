'use client';

import { Chat } from '@ai-sdk/react';
import { DataUIPart, DefaultChatTransport } from 'ai';
import { useParams } from 'next/navigation';
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { saveChatHistory } from '../actions/task-automation-actions';
import { type ChatUIMessage } from '../components/chat/types';
import { useTaskAutomationDataMapper } from './task-automation-store';
import { DataPart } from './types/data-parts';

interface ChatContextValue {
  chat: Chat<ChatUIMessage>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({
  children,
  initialMessages = [],
}: {
  children: ReactNode;
  initialMessages?: any[];
}) {
  const mapDataToState = useTaskAutomationDataMapper();
  const mapDataToStateRef = useRef(mapDataToState);
  mapDataToStateRef.current = mapDataToState;

  const baseUrl = process.env.NEXT_PUBLIC_ENTERPRISE_API_URL;
  const url = `${baseUrl}/api/tasks-automations/chat`;

  const { automationId } = useParams<{ automationId: string }>();
  const isEphemeral = automationId === 'new';

  // Create Chat instance once with initial messages from server
  const chatRef = useRef<Chat<ChatUIMessage> | null>(null);
  if (!chatRef.current) {
    chatRef.current = new Chat<ChatUIMessage>({
      transport: new DefaultChatTransport({
        api: url,
      }),
      messages: initialMessages,
      onToolCall: () => mutate(`/api/auth/info`),
      onData: (data: DataUIPart<DataPart>) => mapDataToStateRef.current(data),
      onError: (error) => {
        toast.error(`Communication error with the AI: ${error.message}`);
        console.error('Error sending message:', error);
      },
      onFinish: async (event) => {
        console.log('[Chat] onFinish triggered, saving to Redis...');
        if (isEphemeral) return;

        const messagesToSave = event.messages;
        console.log('[Chat] Saving', messagesToSave?.length || 0, 'messages');

        const result = await saveChatHistory(automationId, messagesToSave || []);
        console.log('[Chat] Save result:', result);
      },
    });
  }

  return <ChatContext.Provider value={{ chat: chatRef.current }}>{children}</ChatContext.Provider>;
}

export function useSharedChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useSharedChatContext must be used within a ChatProvider');
  }
  return context;
}
