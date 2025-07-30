'use client';

import { Checkbox } from '@comp/ui/checkbox';
import { cn } from '@comp/ui/cn';
import type { FrameworkEditorFramework } from '@db';

type FrameworkCardProps = {
  framework: Pick<FrameworkEditorFramework, 'id' | 'name' | 'description' | 'version' | 'visible'>;
  isSelected: boolean;
  onSelectionChange: (checked: boolean) => void;
  className?: string;
};

export function FrameworkCard({
  framework,
  isSelected,
  onSelectionChange,
  className,
}: FrameworkCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-md border transition-all',
        isSelected
          ? 'border-primary bg-primary/10 dark:bg-primary/15 shadow-sm backdrop-blur-sm'
          : 'border-border bg-card/60 dark:bg-card/50 hover:bg-card/80 dark:hover:bg-card/70 hover:border-muted-foreground/20 backdrop-blur-sm',
        className,
      )}
    >
      <label
        htmlFor={`framework-${framework.id}`}
        className="flex cursor-pointer items-start gap-4 p-4"
      >
        <Checkbox
          id={`framework-${framework.id}`}
          checked={isSelected}
          onCheckedChange={onSelectionChange}
          className="mt-1 flex-shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-0">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm leading-tight font-medium">{framework.name}</h4>
            <div className="flex-shrink-0">
              <span
                className={cn(
                  'inline-flex items-center rounded-xs px-2 py-1 text-xs transition-colors',
                  isSelected
                    ? 'bg-primary/20 text-primary dark:bg-primary/25 dark:text-primary-foreground font-medium'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                v{framework.version}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">{framework.description}</p>
        </div>
      </label>
    </div>
  );
}
