'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { cn } from '../utils';
import { Fade } from './diff/blur-fade';

import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import { clamp } from '../utils/clamp';
import { Button } from './button';
import { CopyButton } from './copy-button';

const CollapsibleCard = ({ className, children, ...props }: Collapsible.CollapsibleProps) => {
  return (
    <Collapsible.Root
      {...props}
      className={cn(
        'relative rounded-xl overflow-hidden border bg-card flex flex-col min-h-14',
        className,
      )}
    >
      {children}
    </Collapsible.Root>
  );
};

const CollapsibleCardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <Collapsible.Trigger asChild>
    <div
      {...props}
      className={cn(
        'absolute h-14 inset-x-4 z-20',
        'flex items-center gap-2 justify-between',
        className,
      )}
    >
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=closed]_&]:-rotate-90" />
      </Button>
      {children}
    </div>
  </Collapsible.Trigger>
);

const CollapsibleCardTitle: React.FC<
  React.HTMLAttributes<HTMLSpanElement> & { title?: string }
> = ({ className, title, children, ...p }) => {
  return (
    <div className="flex items-center gap-2 group flex-1 min-w-0 overflow-hidden flex-end">
      <p
        {...p}
        className={cn('text-sm text-muted-foreground text-nowrap truncate min-w-0', className)}
      >
        {children}
      </p>
      {title && (
        <CopyButton
          value={title}
          className="opacity-0 group-hover:opacity-100 data-[state=copied]:opacity-100"
        />
      )}
    </div>
  );
};

const CollapsibleCardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const bottomFadeRef = useRef<HTMLDivElement>(null);
  const topFadeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (contentRef.current) {
      if (contentRef.current.scrollTop > 0 && topFadeRef.current) {
        topFadeRef.current.style.opacity = '1';
      }
      if (
        contentRef.current.scrollTop + contentRef.current.clientHeight <
          contentRef.current.scrollHeight &&
        bottomFadeRef.current
      ) {
        bottomFadeRef.current.style.opacity = '1';
      }
    }
  }, []);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const opacityTop = clamp(e.currentTarget.scrollTop / 15, [0, 1]);
    topFadeRef.current!.style.opacity = String(opacityTop);
    const scrollBottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight;
    const opacityBottom = clamp(scrollBottom / 15, [0, 1]);
    bottomFadeRef.current!.style.opacity = String(opacityBottom);
  }

  return (
    <Collapsible.Content
      className={cn(
        'overflow-hidden',
        'data-[state=open]:animate-collapsible-down',
        'data-[state=closed]:animate-collapsible-up',
      )}
    >
      <div
        {...props}
        ref={contentRef}
        className={cn('max-h-[70svh] pt-14 pb-4 overflow-auto', className)}
        onScroll={onScroll}
      />
      <Fade
        ref={topFadeRef}
        background="var(--color-background)"
        className="inset-x-0 top-0 h-17 z-10 rounded-t-xl"
        side="top"
        blur="4px"
        stop="60%"
        style={{
          opacity: 0,
        }}
      />
      <Fade
        ref={bottomFadeRef}
        side="bottom"
        background="var(--color-background)"
        className="inset-x-0 bottom-0 h-16 z-10 rounded-b-xl"
        stop="50%"
        blur="2px"
        style={{
          opacity: 0,
        }}
      />
    </Collapsible.Content>
  );
};

export { CollapsibleCard, CollapsibleCardContent, CollapsibleCardHeader, CollapsibleCardTitle };
