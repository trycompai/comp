'use client';

import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@comp/ui/ai-elements/prompt-input';
import { Tool, ToolHeader } from '@comp/ui/ai-elements/tool';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { DefaultChatTransport, getToolName, isToolUIPart } from 'ai';
import type { ToolUIPart } from 'ai';
import { useChat } from '@ai-sdk/react';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PolicyAiAssistantProps {
  policyId: string;
  currentPolicyMarkdown: string;
  onProposedPolicyChange?: (content: string | null) => void;
  close?: () => void;
}

export function PolicyAiAssistant({
  policyId,
  currentPolicyMarkdown,
  onProposedPolicyChange,
  close,
}: PolicyAiAssistantProps) {
  const [input, setInput] = useState('');
  const lastProcessedToolCallRef = useRef<string | null>(null);
  
  const { messages, status, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/policies/${policyId}/chat`,
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistantMessage?.parts) return;

    for (const part of lastAssistantMessage.parts) {
      if (isToolUIPart(part) && getToolName(part) === 'proposePolicy') {
        if (lastProcessedToolCallRef.current === part.toolCallId) {
          continue;
        }
        
        if (part.state === 'input-streaming') {
          continue;
        }
        
        const toolInput = part.input as { content: string; summary: string };
        if (toolInput?.content) {
          lastProcessedToolCallRef.current = part.toolCallId;
          onProposedPolicyChange?.(toolInput.content);
        }
      }
    }
  }, [messages, onProposedPolicyChange]);

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

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
                  : 'text-foreground'
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
                  const toolInput = part.input as { content: string; summary: string };
                  return (
                    <Tool key={`${message.id}-${index}`} className="mt-2">
                      <ToolHeader
                        title={toolInput?.summary || 'Proposing policy changes'}
                        type={toolPart.type}
                        state={toolPart.state}
                      />
                    </Tool>
                  );
                }
                
                return null;
              })}
            </div>
          ))
        )}
        {isLoading && (
          <div className="text-sm text-muted-foreground">Thinking...</div>
        )}
      </div>

      {error && (
        <div className="border-t bg-destructive/10 px-3 py-2">
          <p className="text-xs text-destructive">{error.message}</p>
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
