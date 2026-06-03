'use client';

import { Button } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import Link from 'next/link';

/** The resolved live task for a mapped template, when it exists in the org. */
export interface EvidenceTaskRowTask {
  taskId: string;
  name: string;
  description: string;
}

interface EvidenceTaskRowProps {
  /** Name shown when the template has no live task in this org. */
  fallbackName: string;
  task?: EvidenceTaskRowTask;
  orgId: string;
  /** Action label when the task exists (e.g. 'Open', 'View task'). */
  buttonLabel?: string;
  /** When the tasks fetch failed, distinguish "couldn't load" from "not added". */
  tasksErrored?: boolean;
}

/**
 * A single evidence-task row: task name + description with an "open" action, or
 * a not-added / load-error fallback. Shared by the integration detail page and
 * the per-service detail page so the row markup has one source of truth.
 */
export function EvidenceTaskRow({
  fallbackName,
  task,
  orgId,
  buttonLabel = 'Open',
  tasksErrored = false,
}: EvidenceTaskRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{task?.name ?? fallbackName}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {task?.description ||
            'Mapped to this template, but the task is not in this organization yet.'}
        </p>
      </div>

      {task ? (
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/${orgId}/tasks/${task.taskId}`} />}
          iconRight={<ArrowRight size={14} />}
        >
          {buttonLabel}
        </Button>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">
          {tasksErrored ? 'Couldn’t load tasks' : 'Not added'}
        </span>
      )}
    </div>
  );
}
