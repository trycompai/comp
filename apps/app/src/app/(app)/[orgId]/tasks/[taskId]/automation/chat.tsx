'use client';

import { TEST_PROMPTS } from '@/ai/constants';
import { useChat } from '@ai-sdk/react';
import { MessageCircleIcon, SendIcon } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from './components/ai-elements/conversation';
import { Message } from './components/chat/message';
import type { ChatUIMessage } from './components/chat/types';
import { Panel, PanelHeader } from './components/panels/panels';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { useSharedChatContext } from './lib/chat-context';
import { useTaskAutomationStore } from './lib/task-automation-store';
import { useLocalStorageValue } from './lib/use-local-storage-value';

interface Props {
  className: string;
  modelId?: string;
  orgId: string;
  taskId: string;
}

export function Chat({ className, orgId, taskId }: Props) {
  const [input, setInput] = useLocalStorageValue('prompt-input');
  const { chat } = useSharedChatContext();
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({ chat });
  const { setChatStatus } = useTaskAutomationStore();

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage(
          { text },
          { body: { modelId: 'GPT-5', reasoningEffort: 'medium', orgId, taskId } },
        );
        setInput('');
      }
    },
    [sendMessage, setInput, orgId, taskId],
  );

  const handleSecretAdded = useCallback(
    (secretName: string) => {
      // Send a message to the AI informing it that the secret was added
      sendMessage(
        {
          text: `I've added the secret "${secretName}". You can now use it in the automation script.`,
        },
        { body: { modelId: 'GPT-5', reasoningEffort: 'medium', orgId, taskId } },
      );
    },
    [sendMessage, orgId, taskId],
  );

  const handleInfoProvided = useCallback(
    (info: Record<string, string>) => {
      // Format the provided information for the AI
      const infoText = Object.entries(info)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      // Send a message to the AI with the provided information
      sendMessage(
        {
          text: `I've provided the following information:\n\n${infoText}\n\nYou can now continue with creating the automation script.`,
        },
        { body: { modelId: 'GPT-5', reasoningEffort: 'medium', orgId, taskId } },
      );
    },
    [sendMessage, orgId, taskId],
  );

  useEffect(() => {
    setChatStatus(status);
  }, [status, setChatStatus]);

  return (
    <Panel className={className}>
      <PanelHeader className="shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-md rounded-full" />
            <MessageCircleIcon className="relative w-4 h-4 text-primary" />
          </div>
          <span className="font-medium text-sm tracking-wide text-foreground/90">Chat</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500/80 animate-pulse" />
          <span className="font-mono text-xs text-muted-foreground/60 uppercase tracking-wider">
            {status}
          </span>
        </div>
      </PanelHeader>

      {/* Messages Area */}
      {messages.length === 0 ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col justify-center items-center h-full font-mono text-sm text-muted-foreground p-6">
            <div className="mb-6 text-center">
              <p className="text-sm font-medium text-foreground/90 mb-1">Start with an example</p>
              <p className="text-xs text-muted-foreground/70">Select a template to begin</p>
            </div>
            <div className="w-full max-w-2xl space-y-2">
              {TEST_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  className="group w-full text-left px-6 py-4 rounded-sm border border-primary/20 cursor-pointer bg-card/80 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200"
                  onClick={() => validateAndSubmitMessage(prompt)}
                  disabled={status !== 'ready'}
                >
                  <span className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                    {prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Conversation className="flex-1 min-h-0">
          <ConversationContent className="space-y-4">
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
      )}

      <form
        className="shrink-0 flex items-center p-4 gap-3 border-t border-primary/20 bg-primary/5"
        onSubmit={async (event) => {
          event.preventDefault();
          validateAndSubmitMessage(input);
        }}
      >
        <Input
          className="flex-1 font-normal text-sm rounded-sm border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground px-4 py-2.5"
          disabled={status === 'streaming' || status === 'submitted'}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me to create an automation..."
          value={input}
        />
        <Button
          type="submit"
          disabled={status !== 'ready' || !input.trim()}
          className="px-4 py-2.5"
        >
          <SendIcon className="w-4 h-4" />
        </Button>
      </form>
    </Panel>
  );
}
