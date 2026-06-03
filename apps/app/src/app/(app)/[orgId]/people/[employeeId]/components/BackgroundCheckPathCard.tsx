'use client';

import { cn } from '@trycompai/design-system';
import type { ComponentType, KeyboardEvent, ReactNode } from 'react';

type IconComponent = ComponentType<{ size?: number }>;

export interface PathCardProps {
  selected: boolean;
  onSelect: () => void;
  onNavigate?: (direction: 'next' | 'prev') => void;
  icon: IconComponent;
  iconTone?: 'default' | 'warning';
  title: string;
  description: string;
  meta?: ReactNode;
  disabled?: boolean;
}

export function BackgroundCheckPathCard({
  selected,
  onSelect,
  onNavigate,
  icon: Icon,
  iconTone = 'default',
  title,
  description,
  meta,
  disabled = false,
}: PathCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!disabled) onSelect();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      onNavigate?.('next');
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      onNavigate?.('prev');
    }
  };

  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      tabIndex={selected ? 0 : -1}
      onClick={() => !disabled && onSelect()}
      onKeyDown={handleKeyDown}
      data-selected={selected || undefined}
      className={cn(
        'group relative rounded-[var(--radius)] border px-4 py-3.5 transition-colors duration-200 ease-out',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-muted-foreground',
        selected
          ? 'border-primary bg-[oklch(0.985_0.012_167)] shadow-[inset_0_0_0_1px_var(--primary)]'
          : 'border-border bg-background',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            selected
              ? 'text-primary'
              : iconTone === 'warning'
                ? 'text-[var(--warning)]'
                : 'text-foreground',
          )}
        >
          <Icon size={18} />
        </span>
        <RadioDot selected={selected} />
      </div>
      <div className="mb-[3px] text-sm font-normal text-foreground">{title}</div>
      <div className="mb-2 text-[13px] leading-[1.4] text-muted-foreground">{description}</div>
      {meta ? <div className="font-mono text-xs">{meta}</div> : null}
    </div>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px]',
        selected ? 'border-primary' : 'border-border',
      )}
    >
      {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
    </span>
  );
}
