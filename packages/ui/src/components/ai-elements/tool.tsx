'use client';

import type { ToolUIPart } from 'ai';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../collapsible';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      'not-prose mb-3 w-full rounded-[6px] border border-border/70 bg-linear-to-b',
      className,
    )}
    {...props}
  />
);

export type ToolHeaderProps = ComponentProps<typeof CollapsibleTrigger> & {
  title?: string;
  meta?: ReactNode;
};

export const ToolHeader = ({ className, title, meta, ...props }: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      'flex w-full items-center justify-between gap-3 border-b border-border/60 px-3 py-2',
      className,
    )}
    {...props}
  >
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em]">
        {title}
      </span>
      {meta}
    </div>
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('space-y-2 overflow-hidden px-3 py-2', className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-[10px] uppercase tracking-[0.18em]">
      Parameters
    </h4>
    <div className="rounded bg-muted/50 px-2 py-1.5">
      <pre className="overflow-auto text-[11px] leading-snug">{JSON.stringify(input, null, 2)}</pre>
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ToolUIPart['output'];
  errorText: ToolUIPart['errorText'];
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  return (
    <div className={cn('space-y-2 px-3 py-2', className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-[10px] tracking-[0.18em]">
        {errorText ? 'Error' : 'Result'}
      </h4>
      <div
        className={cn(
          'overflow-x-auto rounded-[4px] text-[11px] leading-snug [&_table]:w-full',
          errorText ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-foreground',
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
