'use client';

import type { FrameworkEditorFramework } from '@comp/db/types';
import { Checkbox } from '@comp/ui/checkbox';
import { cn } from '@comp/ui/cn';

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
          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
          : 'border-border bg-card hover:bg-muted/30 hover:border-muted-foreground/20',
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
              <span className="bg-muted text-muted-foreground inline-flex items-center rounded-xs px-2 py-1 text-xs">
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
