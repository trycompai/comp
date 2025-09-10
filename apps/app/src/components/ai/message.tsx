'use client';

import { useStreamableText } from '@/hooks/use-streamable-text';
import { type StreamableValue } from '@ai-sdk/rsc';
import { cn } from '@comp/ui/cn';
import type { UIMessage } from 'ai';

import equal from 'fast-deep-equal';
import { AnimatePresence, motion } from 'motion/react';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { memo, useCallback, useEffect, useState } from 'react';
import { ErrorFallback } from '../error-fallback';
import { LogoSpinner } from '../logo-spinner';
import { MemoizedReactMarkdown } from '../markdown';
import { ChatAvatar } from './chat-avatar';

interface ToolInvocation {
  toolName: string;
  state: 'call' | 'result';
  result?: any;
}

interface ReasoningPart {
  type: 'reasoning';
  text: string;
  details?: Array<{ type: 'text'; text: string }>;
}

interface ReasoningMessagePartProps {
  part: ReasoningPart;
  isReasoning: boolean;
}

export function ReasoningMessagePart({ part, isReasoning }: ReasoningMessagePartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      marginTop: '1rem',
      marginBottom: 0,
    },
  };

  const memoizedSetIsExpanded = useCallback((value: boolean) => {
    setIsExpanded(value);
  }, []);

  useEffect(() => {
    memoizedSetIsExpanded(isReasoning);
  }, [isReasoning, memoizedSetIsExpanded]);

  return (
    <div className="flex flex-col">
      {isReasoning ? (
        <div className="group relative flex items-start py-2">
          <div className="flex size-[25px] shrink-0 items-center justify-center select-none">
            <ChatAvatar participantType="assistant" aria-label="Assistant" />
          </div>
          <div className="ml-4 flex-1 overflow-hidden pl-2 text-xs">
            <div className="font-medium flex items-center gap-2">
              Reasoning <LogoSpinner size={16} />
            </div>
          </div>
        </div>
      ) : (
        <div className="group relative flex items-start py-2">
          <div className="flex size-[25px] shrink-0 items-center justify-center select-none">
            <ChatAvatar participantType="assistant" aria-label="Assistant" />
          </div>
          <div className="ml-4 flex-1 overflow-hidden pl-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="font-medium">Reasoned for a few seconds</div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="reasoning"
            className="ml-[41px] flex flex-col gap-2 text-sm"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {part.details?.map((detail) =>
              detail.type === 'text' ? (
                <StreamableMarkdown key={detail.text} text={detail.text} />
              ) : (
                '<redacted>'
              ),
            ) || <StreamableMarkdown text={part.text} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const StreamableMarkdown = memo(({ text }: { text: string | StreamableValue<string> }) => {
  const streamedText = useStreamableText(text);

  return (
    <div className="prose text-xs prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
      <MemoizedReactMarkdown
        components={{
          p({ children }) {
            return <p className="my-1 last:mb-0">{children}</p>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>;
          },
          li({ children }) {
            return <li className="leading-tight my-0">{children}</li>;
          },
        }}
      >
        {streamedText}
      </MemoizedReactMarkdown>
    </div>
  );
});

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
}: {
  message: UIMessage;
  isLoading: boolean;
  status: 'error' | 'submitted' | 'streaming' | 'ready';
  isLatestMessage: boolean;
}) => {
  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="group/message mx-auto w-full px-4"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            'group-data-[role=user]/message:w-fit',
          )}
        >
          <div className="flex w-full flex-col space-y-4">
            {message.parts?.map((part: any, i: number) => {
              // Skip invalid parts
              if (!part || !part.type) {
                return null;
              }

              switch (part.type) {
                case 'text':
                  return message.role === 'user' ? (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex w-full flex-row items-start gap-2 pb-2"
                    >
                      <div
                        className={cn('flex flex-col gap-2', {
                          'bg-secondary text-secondary-foreground rounded-sm px-3 py-2':
                            message.role === 'user',
                        })}
                      >
                        <StreamableMarkdown text={part.text || ''} />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex w-full flex-row items-start gap-2 pb-2"
                    >
                      <BotCard key={`message-${message.id}-part-${i}`}>
                        <StreamableMarkdown text={part.text || ''} />
                      </BotCard>
                    </motion.div>
                  );

                case 'reasoning': {
                  return (
                    <ReasoningMessagePart
                      key={`message-${message.id}-${i}`}
                      part={part as ReasoningPart}
                      isReasoning={
                        (message.parts &&
                          status === 'streaming' &&
                          i === message.parts.length - 1) ??
                        false
                      }
                    />
                  );
                }

                default:
                  // Skip tool parts - only show final text response
                  return null;
              }
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export function ReasoningCard({
  children,
  showAvatar = true,
  className,
}: {
  children?: React.ReactNode;
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <ErrorBoundary errorComponent={ErrorFallback}>
      <div className={cn(className)}>
        <div className="flex flex-row items-center gap-2">
          {showAvatar && <ChatAvatar participantType="assistant" />}
        </div>

        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </ErrorBoundary>
  );
}

export function BotCard({
  children,
  showAvatar = true,
  className,
}: {
  children?: React.ReactNode;
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <ErrorBoundary errorComponent={ErrorFallback}>
      <div className="group relative flex items-start py-2">
        <div className="flex size-[25px] shrink-0 items-center justify-center select-none">
          {showAvatar && <ChatAvatar participantType="assistant" />}
        </div>

        <div className={cn('ml-4 flex-1 overflow-hidden pl-2 text-xs leading-relaxed', className)}>
          {children}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export function UserMessage({ content }: { content: string }) {
  return (
    <ErrorBoundary errorComponent={ErrorFallback}>
      <div className="group relative flex items-start py-2">
        <div className="flex size-[25px] shrink-0 items-center justify-center select-none">
          <ChatAvatar participantType="user" />
        </div>

        <div className="ml-4 flex-1 overflow-hidden pl-2 text-xs leading-relaxed">
          <StreamableMarkdown text={content} />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export const Message = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;

  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;

  return true;
});
