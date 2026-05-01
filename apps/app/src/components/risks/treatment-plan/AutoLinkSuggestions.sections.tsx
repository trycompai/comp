'use client';

import { cn } from '@/lib/utils';
import { Text } from '@trycompai/design-system';
import { Checkmark } from '@trycompai/design-system/icons';
import {
  isControlDerived,
  type SuggestedControl,
  type SuggestedTask,
} from './AutoLinkSuggestions.types';

export function ConfidencePill({ score }: { score: number }) {
  if (score <= 0) {
    return (
      <span className="mt-0.5 shrink-0 font-mono text-[11px] tabular-nums tracking-[-0.02em] text-muted-foreground">
        —
      </span>
    );
  }
  // Cap at 100%; raw similarity + boost can exceed 1 in theory.
  const pct = Math.min(100, Math.round(score * 100));
  const tier = pct >= 85 ? 'high' : pct >= 70 ? 'med' : 'low';
  const colorClass =
    tier === 'high'
      ? 'text-green-600 dark:text-green-400'
      : tier === 'med'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground';
  return (
    <span
      className={cn(
        'mt-0.5 shrink-0 font-mono text-[11px] tabular-nums tracking-[-0.02em]',
        colorClass,
      )}
    >
      {pct}%
    </span>
  );
}

export function TasksSection({
  tasks,
  checkedTaskIds,
  onToggle,
}: {
  tasks: SuggestedTask[];
  checkedTaskIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-normal">
        <span>Tasks</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {checkedTaskIds.size} / {tasks.length} selected
        </span>
      </div>
      {tasks.length === 0 ? (
        <p className="py-2 text-[12px] text-muted-foreground">
          No tasks suggested. Try rerunning or link manually.
        </p>
      ) : (
        tasks.map((t) => {
          const checked = checkedTaskIds.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggle(t.id)}
              aria-pressed={checked}
              aria-label={`${checked ? 'Uncheck' : 'Check'} task ${t.title}`}
              className="flex w-full items-start gap-2.5 border-b border-border bg-transparent px-1 py-2.5 text-left transition-colors hover:bg-muted"
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors',
                  checked ? 'border-primary bg-primary' : 'border-border bg-background',
                )}
              >
                {checked && (
                  <Checkmark size={11} className="text-primary-foreground" aria-hidden="true" />
                )}
              </span>
              <div className={cn('min-w-0 flex-1', !checked && 'opacity-55')}>
                <div className="text-[13px] leading-[1.4]">{t.title}</div>
              </div>
              <ConfidencePill score={t.score} />
            </button>
          );
        })
      )}
    </div>
  );
}

export function ControlsSection({
  controls,
  checkedTaskIds,
  derivedControlsCount,
}: {
  controls: SuggestedControl[];
  checkedTaskIds: Set<string>;
  derivedControlsCount: number;
}) {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-1 flex items-center justify-between text-xs font-normal">
        <span>Controls</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {derivedControlsCount} {derivedControlsCount === 1 ? 'control' : 'controls'} via tasks
        </span>
      </div>
      <Text size="xs" variant="muted" as="p">
        These controls will be linked through the selected tasks.
      </Text>
      <div className="mt-2">
        {controls.map((c) => {
          const isDerived = isControlDerived(c, checkedTaskIds);
          return (
            <div
              key={c.id}
              className={cn(
                'flex items-start gap-2.5 border-b border-border px-1 py-2.5',
                !isDerived && 'opacity-55',
              )}
            >
              <span className="mt-0.5 inline-block h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-[1.4]">
                  {c.code} · {c.name}
                </div>
                <div className="mt-0.5 text-[11px] leading-[1.4] text-muted-foreground">
                  {c.framework}
                </div>
              </div>
              <ConfidencePill score={c.score} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
