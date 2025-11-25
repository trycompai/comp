'use client';

import { useChat } from '@ai-sdk/react';
import { Button } from '@comp/ui/button';
import { DiffViewer } from '@comp/ui/diff-viewer';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Textarea } from '@comp/ui/textarea';
import type { JSONContent } from '@tiptap/react';
import { createPatch } from 'diff';
import { DefaultChatTransport } from 'ai';
import { Bot, Send, X, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

interface PolicyAiAssistantProps {
  policyId: string;
  currentPolicyMarkdown: string;
  applyChanges?: (content: Array<JSONContent>) => Promise<void>;
  close?: () => void;
}

export function PolicyAiAssistant({
  policyId,
  currentPolicyMarkdown,
  applyChanges,
  close,
}: PolicyAiAssistantProps) {
  const [input, setInput] = useState('');
  const [proposedContent, setProposedContent] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [showDiff, setShowDiff] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/policies/${policyId}/chat`,
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const diffPatch = useMemo(() => {
    if (!proposedContent) return null;
    return createPatch(
      'policy.md',
      currentPolicyMarkdown,
      proposedContent,
      'Current',
      'Proposed'
    );
  }, [currentPolicyMarkdown, proposedContent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    if (lastAssistantMessage?.parts) {
      const textContent = lastAssistantMessage.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('');

      const policyMatch = textContent.match(/```policy\n([\s\S]*?)```/);
      if (policyMatch) {
        setProposedContent(policyMatch[1].trim());
      }
    }
  }, [messages]);

  function submitMessage(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput('');
    }
  }

  async function apply() {
    if (!proposedContent || !applyChanges) return;

    setIsApplying(true);
    try {
      const jsonContent = markdownToTipTapJSON(proposedContent);
      await applyChanges(jsonContent);
      setProposedContent(null);
    } catch (err) {
      console.error('Failed to apply changes:', err);
    } finally {
      setIsApplying(false);
    }
  }

  function dismiss() {
    setProposedContent(null);
  }

  function toggleDiff() {
    setShowDiff(!showDiff);
  }

  function updateInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage(e);
    }
  }

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium">AI Policy Assistant</span>
        </div>
        {close && (
          <Button variant="ghost" size="icon" onClick={close}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">
              Ask me to help edit this policy. I can suggest improvements,
              update specific sections, or help ensure compliance.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <p className="text-muted-foreground">Try asking:</p>
              <ul className="space-y-1">
                <li>&quot;Add a data retention section&quot;</li>
                <li>&quot;Make this more SOC 2 compliant&quot;</li>
                <li>&quot;Simplify the language&quot;</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {message.parts
                        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                        .map((part, index) => (
                          <ReactMarkdown
                            key={index}
                            components={{
                              code({ className, children, ...props }) {
                                const isPolicy = className === 'language-policy';
                                if (isPolicy) {
                                  return (
                                    <div className="my-2 rounded-xs border bg-green-50 p-2 text-xs dark:bg-green-900/20">
                                      <div className="mb-1 text-xs font-medium text-green-700 dark:text-green-400">
                                        Proposed Policy Content
                                      </div>
                                      <pre className="whitespace-pre-wrap text-muted-foreground">
                                        {String(children).substring(0, 500)}
                                        {String(children).length > 500 && '...'}
                                      </pre>
                                    </div>
                                  );
                                }
                                return (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {part.text}
                          </ReactMarkdown>
                        ))}
                    </div>
                  ) : (
                    message.parts
                      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                      .map((part) => part.text)
                      .join('')
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {proposedContent && applyChanges && (
        <div className="border-t bg-green-50 p-3 dark:bg-green-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Changes ready to apply
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleDiff}
                className="gap-1"
              >
                {showDiff ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Hide Diff
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    Show Diff
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={dismiss}>
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={apply}
                disabled={isApplying}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApplying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Apply Changes
              </Button>
            </div>
          </div>
          {showDiff && diffPatch && (
            <div className="max-h-48 overflow-auto rounded-xs border bg-background">
              <DiffViewer patch={diffPatch} />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="border-t bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      )}

      <form onSubmit={submitMessage} className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={updateInput}
            placeholder="Ask about this policy..."
            className="min-h-[40px] max-h-[120px] resize-none"
            onKeyDown={handleKeyDown}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function markdownToTipTapJSON(markdown: string): Array<JSONContent> {
  const lines = markdown.split('\n');
  const content: Array<JSONContent> = [];
  let currentList: JSONContent | null = null;
  let listType: 'bulletList' | 'orderedList' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        listType = null;
      }
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        listType = null;
      }
      content.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: [{ type: 'text', text: headingMatch[2] }],
      });
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      if (listType !== 'bulletList') {
        if (currentList) content.push(currentList);
        currentList = { type: 'bulletList', content: [] };
        listType = 'bulletList';
      }
      (currentList!.content as Array<JSONContent>).push({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: bulletMatch[1] }],
          },
        ],
      });
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (listType !== 'orderedList') {
        if (currentList) content.push(currentList);
        currentList = { type: 'orderedList', content: [] };
        listType = 'orderedList';
      }
      (currentList!.content as Array<JSONContent>).push({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: orderedMatch[1] }],
          },
        ],
      });
      continue;
    }

    if (currentList) {
      content.push(currentList);
      currentList = null;
      listType = null;
    }
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: trimmed }],
    });
  }

  if (currentList) {
    content.push(currentList);
  }

  return content.length > 0
    ? content
    : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }];
}
