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
    <div
      className={cn(
        'relative flex items-center px-5 py-3',
        // Primary-tinted header for better contrast
        'bg-primary/5',
        // Primary-accented divider
        'border-b border-primary/20',
        className,
      )}
    >
      {children}
    </div>
  );
}
