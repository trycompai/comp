import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  className?: string;
  children: ReactNode;
}

export function Panel({ className, children }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col relative w-full h-full overflow-hidden',
        // Ensure consistent width regardless of content and prevent layout shift
        'min-w-0',
        // Subtle card background
        'bg-card',
        // Full border for clear separation
        'border border-border',
        // Light shadow for elevation
        'shadow-sm',
        // Slight rounding
        'rounded-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({ className, children }: Props) {
  return (
    <div className={cn('relative flex items-center shrink-0 h-12 px-4', className)}>{children}</div>
  );
}
