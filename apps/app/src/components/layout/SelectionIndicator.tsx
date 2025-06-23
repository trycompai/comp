'use client';

import { cn } from '@comp/ui/cn';
import { Check } from 'lucide-react';

interface SelectionIndicatorProps {
  isSelected: boolean;
  className?: string;
  variant?: 'radio' | 'checkbox';
}

export function SelectionIndicator({
  isSelected,
  className,
  variant = 'radio',
}: SelectionIndicatorProps) {
  return (
    <div
      className={cn(
        'h-6 w-6 border-2 flex items-center justify-center transition-all',
        variant === 'radio' ? 'rounded-full' : 'rounded-md',
        isSelected
          ? 'bg-transparent border-green-500'
          : 'bg-transparent border-muted-foreground/50',
        className,
      )}
    >
      {isSelected && <Check className="h-4 w-4 text-green-500" />}
    </div>
  );
}
