'use client';

import { ChevronRight, Close } from '@trycompai/design-system/icons';
import Link from 'next/link';
import type { PolicyEvidenceTaskGroup } from '../../hooks/usePolicyEvidenceTasks';
import { TaskStatusPill } from './TaskStatusPill';

interface ControlSectionProps {
  group: PolicyEvidenceTaskGroup;
  orgId: string;
  isExpanded: boolean;
  onToggle: () => void;
  canRemove: boolean;
  onRequestRemove: () => void;
}

export function ControlSection({
  group,
  orgId,
  isExpanded,
  onToggle,
  canRemove,
  onRequestRemove,
}: ControlSectionProps) {
  const { control, tasks } = group;
  return (
    <div>
      <div className="group/control-row flex items-center hover:bg-muted/50 transition-colors">
        <button
          type="button"
          onClick={onToggle}
          aria-label={isExpanded ? `Collapse ${control.name}` : `Expand ${control.name}`}
          aria-expanded={isExpanded}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronRight
            size={14}
            className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>
        <Link
          href={`/${orgId}/controls/${control.id}`}
          className="flex-1 py-2.5 text-sm hover:underline"
        >
          {control.name}
        </Link>
        <span className="px-3 text-xs text-muted-foreground whitespace-nowrap">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRequestRemove}
            aria-label={`Remove ${control.name}`}
            className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/control-row:opacity-100 focus-visible:opacity-100"
          >
            <Close size={14} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="bg-muted/20 border-t divide-y divide-border/40">
          {tasks.length === 0 ? (
            <div className="pl-12 pr-3 py-2 text-xs text-muted-foreground">
              No tasks attached to this control.
            </div>
          ) : (
            tasks.map((task) => (
              <Link
                key={task.id}
                href={`/${orgId}/tasks/${task.id}`}
                className="flex items-center gap-3 pl-12 pr-3 py-2 text-sm hover:bg-muted/40 transition-colors"
              >
                <span className="flex-1 truncate">{task.title}</span>
                <TaskStatusPill status={task.status} />
                {task.frequency ? (
                  <span className="text-xs text-muted-foreground capitalize whitespace-nowrap">
                    {task.frequency}
                  </span>
                ) : null}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
