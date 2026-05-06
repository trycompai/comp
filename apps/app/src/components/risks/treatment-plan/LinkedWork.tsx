'use client';

import { cn } from '@/lib/utils';
import { TaskStatus } from '@db';
import { Checkmark, Close, TrashCan } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useState } from 'react';

interface LinkedTask {
  id: string;
  title: string;
  status: TaskStatus;
  controls: { id: string; name: string }[];
}

interface LinkedWorkProps {
  orgId: string;
  tasks: LinkedTask[];
  /**
   * Per-task unlink. When provided, a trash-can icon button appears on
   * hover next to each task title. When omitted (e.g. read-only views),
   * no unlink affordance is rendered.
   */
  onUnlinkTask?: (taskId: string) => Promise<void>;
}

function isTaskDone(status: TaskStatus): boolean {
  return status === TaskStatus.done || status === TaskStatus.not_relevant;
}

interface DerivedControl {
  id: string;
  name: string;
  /** True only when every linked task that brings in this control is done. */
  isComplete: boolean;
}

function deriveControls(tasks: LinkedTask[]): DerivedControl[] {
  const map = new Map<string, { name: string; parentDone: boolean[] }>();
  for (const t of tasks) {
    for (const c of t.controls) {
      const entry = map.get(c.id) ?? { name: c.name, parentDone: [] };
      entry.parentDone.push(isTaskDone(t.status));
      map.set(c.id, entry);
    }
  }
  return [...map.entries()].map(([id, { name, parentDone }]) => ({
    id,
    name,
    isComplete: parentDone.length > 0 && parentDone.every(Boolean),
  }));
}

function StatusIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <Checkmark
        size={11}
        className="shrink-0 text-green-600 dark:text-green-400"
        aria-hidden="true"
      />
    );
  }
  return (
    <Close
      size={11}
      className="shrink-0 text-red-600 dark:text-red-400"
      aria-hidden="true"
    />
  );
}

export function LinkedWork({ orgId, tasks, onUnlinkTask }: LinkedWorkProps) {
  const total = tasks.length;
  const done = tasks.filter((t) => isTaskDone(t.status)).length;
  const taskPct = total === 0 ? 0 : Math.round((done / total) * 100);
  const controls = deriveControls(tasks);
  const controlsDone = controls.filter((c) => c.isComplete).length;
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const handleUnlink = async (taskId: string) => {
    if (!onUnlinkTask) return;
    setUnlinking(taskId);
    try {
      await onUnlinkTask(taskId);
    } finally {
      setUnlinking((current) => (current === taskId ? null : current));
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
      {/* Tasks group */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[13px] font-normal">Tasks</span>
          <span className="flex-1" />
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {done} / {total}
          </span>
        </div>
        <div className="bg-muted mb-1.5 h-[3px] w-full overflow-hidden rounded-full">
          <span
            className="block h-full rounded-full"
            style={{ width: `${taskPct}%`, background: 'var(--warning)' }}
          />
        </div>
        {tasks.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            No tasks linked. Link tasks from the Tasks tab to track mitigation progress.
          </p>
        ) : (
          // Cap the height so a long linked-task list doesn't stretch the
          // Linked Work column past the Strategy / Treatment plan columns.
          // Internal scroll keeps the visible list compact.
          <ul className="flex max-h-80 flex-col overflow-y-auto pr-1">
            {tasks.map((t, i) => {
              const taskDone = isTaskDone(t.status);
              const isUnlinking = unlinking === t.id;
              return (
                <li
                  key={t.id}
                  className={cn(
                    'group flex items-center gap-2',
                    i > 0 && 'border-t border-border',
                  )}
                >
                  <Link
                    href={`/${orgId}/tasks/${t.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'flex flex-1 items-center gap-2 py-1.5 text-[12px] transition-colors hover:bg-muted',
                      taskDone
                        ? 'text-muted-foreground line-through decoration-muted-foreground'
                        : 'text-foreground',
                    )}
                  >
                    <StatusIcon done={taskDone} />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  </Link>
                  {onUnlinkTask && (
                    <button
                      type="button"
                      onClick={() => void handleUnlink(t.id)}
                      disabled={isUnlinking}
                      title="Unlink task from this risk"
                      aria-label={`Unlink ${t.title}`}
                      className="rounded px-1.5 py-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <TrashCan size={12} aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="h-px bg-border" aria-hidden="true" />

      {/* Controls group */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[13px] font-normal">Controls</span>
          <span className="flex-1" />
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {controlsDone} / {controls.length}
          </span>
        </div>
        {controls.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            No controls linked (derived from tasks).
          </p>
        ) : (
          // Same height cap as the Tasks list above.
          <ul className="flex max-h-80 flex-col overflow-y-auto pr-1">
            {controls.map((c, i) => (
              <li
                key={c.id}
                className={cn(i > 0 && 'border-t border-border')}
              >
                <Link
                  href={`/${orgId}/controls/${c.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-2 py-1.5 text-[12px] transition-colors hover:bg-muted',
                    c.isComplete
                      ? 'text-muted-foreground line-through decoration-muted-foreground'
                      : 'text-foreground',
                  )}
                >
                  <StatusIcon done={c.isComplete} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
