"use client";

import type { ComponentProps } from "react";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import { Button } from "@trycompai/ui/button";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex-1 overflow-y-auto", className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
);

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn("space-y-8 px-4 py-6 lg:px-8", className)}
    {...props}
  />
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
          "absolute bottom-6 left-[50%] translate-x-[-50%] rounded-full",
          "bg-card",
          "border-border border",
          "shadow-md hover:shadow-lg",
          "transition-all duration-200",
          className,
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="ghost"
        {...props}
      >
        <ArrowDownIcon className="text-muted-foreground size-4" />
      </Button>
    )
  );
};
