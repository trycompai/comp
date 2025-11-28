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
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { getToolName, isToolUIPart, type ChatStatus, type ToolUIPart, type UIMessage } from 'ai';
import { X } from 'lucide-react';
import { useState } from 'react';

interface PolicyAiAssistantProps {
  messages: UIMessage[];
  status: ChatStatus;
  errorMessage?: string | null;
  sendMessage: (payload: { text: string }) => void;
  close?: () => void;
}

export function PolicyAiAssistant({
  messages,
  status,
  errorMessage,
  sendMessage,
  close,
}: PolicyAiAssistantProps) {
  const [input, setInput] = useState('');

  const isLoading = status === 'streaming' || status === 'submitted';

  const hasActiveTool = messages.some(
    (m) =>
      m.role === 'assistant' &&
      m.parts.some(
        (p) => isToolUIPart(p) && (p.state === 'input-streaming' || p.state === 'input-available'),
      ),
  );

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">AI Assistant</span>
        {close && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Conversation>
        <ConversationContent className="gap-3 p-3">
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              <p>Ask me to help edit this policy.</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>"Add a data retention section"</li>
                <li>"Make this more SOC 2 compliant"</li>
                <li>"Simplify the language"</li>
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

                  if (isToolUIPart(part) && getToolName(part) === 'proposePolicy') {
                    const toolPart = part as ToolUIPart;
                    const toolInput = toolPart.input as { content?: string; summary?: string };
                    return (
                      <Tool key={`${message.id}-${index}`} className="mt-2">
                        <ToolHeader
                          title={toolInput?.summary || 'Proposing policy changes'}
                          type={toolPart.type}
                          state={toolPart.state}
                        />
                        <p className="px-3 pb-2 text-xs text-muted-foreground">
                          View the proposed changes in the editor preview
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
