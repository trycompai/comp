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
import { ModelSelector } from './components/settings/model-selector';
import { Settings } from './components/settings/settings';
import { useSettings } from './components/settings/use-settings';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { useSharedChatContext } from './lib/chat-context';
import { useLocalStorageValue } from './lib/use-local-storage-value';
import { useSandboxStore } from './state';

interface Props {
  className: string;
  modelId?: string;
}

export function Chat({ className }: Props) {
  const [input, setInput] = useLocalStorageValue('prompt-input');
  const { chat } = useSharedChatContext();
  const { modelId, reasoningEffort } = useSettings();
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({ chat });
  const { setChatStatus } = useSandboxStore();

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage({ text }, { body: { modelId, reasoningEffort } });
        setInput('');
      }
    },
    [sendMessage, modelId, setInput, reasoningEffort],
  );

  useEffect(() => {
    setChatStatus(status);
  }, [status, setChatStatus]);

  return (
    <Panel className={className}>
      <PanelHeader>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
            <MessageCircleIcon className="relative w-4 h-4 text-primary" />
          </div>
          <span className="font-medium text-sm tracking-wide text-foreground/90">Chat</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500/80 animate-pulse" />
          <span className="font-mono text-xs text-muted-foreground/50 uppercase tracking-wider">
            {status}
          </span>
        </div>
      </PanelHeader>

      {/* Messages Area */}
      {messages.length === 0 ? (
        <div className="flex-1 min-h-0">
          <div className="flex flex-col justify-center items-center h-full font-mono text-sm text-muted-foreground p-4">
            <div className="mb-8 text-center">
              <p className="text-sm font-medium text-foreground/80 mb-2">Start with an example</p>
              <p className="text-xs text-muted-foreground/60">Select a template to begin</p>
            </div>
            <div className="w-full max-w-2xl space-y-2">
              {TEST_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  className="group w-full text-left px-6 py-5 rounded-sm border border-border cursor-pointer bg-card hover:bg-muted/50 hover:border-border/80 hover:shadow-md transition-all duration-200"
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
        <Conversation className="relative w-full">
          <ConversationContent className="space-y-4">
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <form
        className="flex items-center p-4 gap-3 border-t border-border bg-muted/30"
        onSubmit={async (event) => {
          event.preventDefault();
          validateAndSubmitMessage(input);
        }}
      >
        <Settings />
        <ModelSelector />
        <Input
          className="flex-1 font-normal text-sm rounded-sm border border-border bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all duration-200 placeholder:text-muted-foreground px-4 py-2.5"
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
