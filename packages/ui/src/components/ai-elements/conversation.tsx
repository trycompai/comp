'use client';

import { ArrowDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCallback } from 'react';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';
import { cn } from '../../utils';
import { Button } from '../button';

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn(
      'relative flex-1 overflow-hidden bg-linear-to-b from-background via-background to-muted/60',
      className,
    )}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
);

export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>;

export const ConversationContent = ({ className, ...props }: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn(
      'flex flex-col gap-4 px-3 py-4 md:px-4 md:py-6 max-w-2xl mx-auto w-full',
      className,
    )}
    {...props}
  />
);

export type ConversationHeaderProps = ComponentProps<'div'>;

export const ConversationHeader = ({ className, ...props }: ConversationHeaderProps) => (
  <div
    className={cn(
      'flex items-center justify-between gap-2 border-b border-border/60 bg-background/95 px-3 py-2',
      'text-[11px] uppercase tracking-[0.18em] text-muted-foreground',
      className,
    )}
    {...props}
  />
);

export type ConversationTitleProps = ComponentProps<'div'>;

export const ConversationTitle = ({ className, ...props }: ConversationTitleProps) => (
  <div
    className={cn(
      'font-semibold text-xs tracking-[0.18em] uppercase text-foreground/80',
      className,
    )}
    {...props}
  />
);

export type ConversationEmptyStateProps = ComponentProps<'div'> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = 'No messages yet',
  description = 'Start a conversation to see messages here',
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      'flex size-full flex-col items-center justify-center gap-2 px-4 py-6 text-center',
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-xs uppercase tracking-[0.18em] text-foreground/80">
            {title}
          </h3>
          {description && (
            <p className="mx-auto max-w-sm text-muted-foreground text-xs/6">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn(
          'absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full border-border/70 bg-background/95',
          'h-7 w-7 shadow-[0_10px_30px_rgba(15,23,42,0.22)] backdrop-blur-sm',
          className,
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};
