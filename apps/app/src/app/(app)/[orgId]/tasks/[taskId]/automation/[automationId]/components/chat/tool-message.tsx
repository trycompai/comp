import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function ToolMessage(props: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'text-xs px-4 py-3.5 font-mono overflow-x-auto break-words',
        'bg-muted',
        'border border-border',
        'rounded-sm',
        'shadow-sm',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
