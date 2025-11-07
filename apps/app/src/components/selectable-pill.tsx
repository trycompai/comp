'use client';

import { cn } from '@comp/ui/cn';
import { Plus, X } from 'lucide-react';

type SelectablePillProps = {
  label: string;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  className?: string;
  disabled?: boolean;
  showIcon?: boolean;
};

export function SelectablePill({
  label,
  isSelected,
  onSelectionChange,
  className,
  disabled = false,
  showIcon = false,
}: SelectablePillProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelectionChange(!isSelected)}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-sm',
        isSelected
          ? 'bg-primary/10 text-foreground border border-primary shadow-sm'
          : 'border border-border text-foreground hover:bg-muted/30',
        className,
      )}
    >
      {label}
      {showIcon && (
        <span className="ml-1">
          {isSelected ? (
            <X className="h-3 w-3" />
          ) : (
            <div className="flex items-center justify-center w-5 h-5 rounded-full border">
              <Plus className="h-3 w-3 text-black" />
            </div>
          )}
        </span>
      )}
    </button>
  );
}
