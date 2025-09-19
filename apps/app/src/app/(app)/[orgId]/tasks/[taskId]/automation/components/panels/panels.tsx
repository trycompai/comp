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
        // Use semantic background
        'bg-card',
        // Clear border definition
        'border border-border',
        'shadow-lg',
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
    <div
      className={cn(
        'relative flex items-center px-6 py-4',
        // Distinct header background
        'bg-muted/30',
        // Strong bottom border
        'border-b border-border',
        className,
      )}
    >
      {children}
    </div>
  );
}
