'use client';

import { Chat } from '@ai-sdk/react';
import { DataUIPart, DefaultChatTransport } from 'ai';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { type ChatUIMessage } from '../components/chat/types';
import { useTaskAutomationDataMapper } from './task-automation-store';
import { DataPart } from './types/data-parts';

interface ChatContextValue {
  chat: Chat<ChatUIMessage>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const mapDataToState = useTaskAutomationDataMapper();
  const mapDataToStateRef = useRef(mapDataToState);
  mapDataToStateRef.current = mapDataToState;

  const baseUrl = process.env.NEXT_PUBLIC_ENTERPRISE_API_URL;
  const url = `${baseUrl}/api/tasks-automations/chat`;

  const chat = useMemo(
    () =>
      new Chat<ChatUIMessage>({
        transport: new DefaultChatTransport({
          api: url,
        }),
        onToolCall: () => mutate(`/api/auth/info`),
        onData: (data: DataUIPart<DataPart>) => mapDataToStateRef.current(data),
        onError: (error) => {
          toast.error(`Communication error with the AI: ${error.message}`);
          console.error('Error sending message:', error);
        },
      }),
    [],
  );

  return <ChatContext.Provider value={{ chat }}>{children}</ChatContext.Provider>;
}

export function useSharedChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useSharedChatContext must be used within a ChatProvider');
  }
  return context;
}
