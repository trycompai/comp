'use client';

import { useSession } from '@/utils/auth-client';
import { useChat } from '@ai-sdk/react';
import { ScrollArea } from '@comp/ui/scroll-area';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useState } from 'react';
import { ChatEmpty } from './chat-empty';
import { ChatTextarea } from './chat-text-area';
import { Messages } from './messages';

export default function Chat() {
  const { data: session } = useSession();

  const [input, setInput] = useState('');

  const { messages, sendMessage, addToolResult, error, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),

    // Automatically submit when all server-side tool calls are complete
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  if (error) return <div>{error.message}</div>;

  return (
    <div className="relative flex h-full flex-col">
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
