'use client';

import { cn } from '@/lib/utils';
import { TaskStatus } from '@db';
import {
  Checkmark,
  ChevronLeft,
  ChevronRight,
  Close,
  TrashCan,
} from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Show 4 items per page in each list (Tasks + Controls). Long lists used
// to stretch the column past the Strategy / Treatment-plan columns and
// force the page to scroll just to see the bottom controls.
const PAGE_SIZE = 4;

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

function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
}: {
  page: number;
  pageCount: number;
  onPageChange: (next: number) => void;
  total: number;
}) {
  if (pageCount <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
      <span className="font-mono tabular-nums">
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-transparent text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={12} aria-hidden="true" />
        </button>
        <span className="font-mono tabular-nums">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-transparent text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
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

  // Per-list pagination (Tasks + Controls). Reset to page 1 when the
  // underlying list shrinks past the current page (e.g. after an unlink
  // that drops the last task on the visible page).
  const [taskPage, setTaskPage] = useState(1);
  const [controlPage, setControlPage] = useState(1);
  const taskPageCount = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));
  const controlPageCount = Math.max(1, Math.ceil(controls.length / PAGE_SIZE));
  useEffect(() => {
    if (taskPage > taskPageCount) setTaskPage(taskPageCount);
  }, [taskPage, taskPageCount]);
  useEffect(() => {
    if (controlPage > controlPageCount) setControlPage(controlPageCount);
  }, [controlPage, controlPageCount]);
  const visibleTasks = tasks.slice(
    (taskPage - 1) * PAGE_SIZE,
    (taskPage - 1) * PAGE_SIZE + PAGE_SIZE,
  );
  const visibleControls = controls.slice(
    (controlPage - 1) * PAGE_SIZE,
    (controlPage - 1) * PAGE_SIZE + PAGE_SIZE,
  );

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
          <>
            <ul className="flex flex-col">
              {visibleTasks.map((t, i) => {
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
            <Pagination
              page={taskPage}
              pageCount={taskPageCount}
              onPageChange={setTaskPage}
              total={tasks.length}
            />
          </>
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
          <>
            <ul className="flex flex-col">
              {visibleControls.map((c, i) => (
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
            <Pagination
              page={controlPage}
              pageCount={controlPageCount}
              onPageChange={setControlPage}
              total={controls.length}
            />
          </>
        )}
      </div>
    </div>
  );
}
