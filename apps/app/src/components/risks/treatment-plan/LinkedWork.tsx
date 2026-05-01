'use client';

import { cn } from '@/lib/utils';
import { TaskStatus } from '@db';
import { Checkmark, Close, Subtract } from '@trycompai/design-system/icons';
import Link from 'next/link';

interface LinkedTask {
  id: string;
  title: string;
  status: TaskStatus;
  controls: { id: string; name: string }[];
}

interface LinkedWorkProps {
  orgId: string;
  tasks: LinkedTask[];
  /** When provided, each task row renders a × button that calls this. */
  onUnlinkTask?: (taskId: string) => Promise<void>;
}

function isTaskDone(status: TaskStatus): boolean {
  return status === TaskStatus.done || status === TaskStatus.not_relevant;
}

export function LinkedWork({ orgId, tasks, onUnlinkTask }: LinkedWorkProps) {
  const total = tasks.length;
  const done = tasks.filter((t) => isTaskDone(t.status)).length;
  const taskPct = total === 0 ? 0 : Math.round((done / total) * 100);

  const uniqueControls = new Map<string, { id: string; name: string }>();
  for (const t of tasks) {
    for (const c of t.controls) uniqueControls.set(c.id, c);
  }
  const controls = [...uniqueControls.values()];

  return (
    <div className="flex flex-col gap-3">
      {/* Tasks card */}
      <div className="bg-background rounded-md border border-border p-3">
        <div className="mb-2 flex items-center">
          <span className="text-[13px] font-normal">Tasks</span>
          <span className="flex-1" />
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {done}/{total}
          </span>
        </div>
        <div className="bg-muted mb-2 h-1 w-full overflow-hidden rounded-full">
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
          <ul className="flex flex-col">
            {tasks.map((t) => {
              const isDone = isTaskDone(t.status);
              return (
                <li key={t.id} className="flex items-center gap-2 py-1 text-[12px]">
                  {isDone ? (
                    <Checkmark
                      size={11}
                      className="shrink-0 text-green-600 dark:text-green-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <Subtract
                      size={11}
                      className="shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <Link
                    href={`/${orgId}/tasks/${t.id}`}
                    className={cn(
                      'truncate hover:underline',
                      isDone
                        ? 'text-muted-foreground line-through decoration-muted-foreground'
                        : 'text-foreground',
                    )}
                  >
                    {t.title}
                  </Link>
                  {onUnlinkTask && (
                    <button
                      type="button"
                      onClick={() => {
                        void onUnlinkTask(t.id);
                      }}
                      className="ml-auto rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={`Unlink ${t.title}`}
                    >
                      <Close size={11} aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Controls card */}
      <div className="bg-background rounded-md border border-border p-3">
        <div className="mb-2 flex items-center">
          <span className="text-[13px] font-normal">Controls</span>
          <span className="flex-1" />
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {controls.length}
          </span>
        </div>
        {controls.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            No controls linked (derived from tasks).
          </p>
        ) : (
          <ul className="flex flex-col">
            {controls.map((c) => (
              <li key={c.id} className="flex items-center gap-2 py-1 text-[12px]">
                <Subtract
                  size={11}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <Link
                  href={`/${orgId}/controls/${c.id}`}
                  className="truncate text-foreground hover:underline"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
