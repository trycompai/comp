'use client';

import { useMemo } from 'react';

import type { Member, Task, User } from '@db';
import { Checkbox } from '@comp/ui/checkbox';
import Image from 'next/image';
import { AutomationIndicator } from './AutomationIndicator';
import { TaskStatusSelector } from './TaskStatusSelector';

interface ModernTaskListItemProps {
  task: Task & {
    controls?: { id: string; name: string }[];
    evidenceAutomations?: Array<{
      id: string;
      isEnabled: boolean;
      name: string;
      runs?: Array<{
        status: string;
        success: boolean | null;
        evaluationStatus: string | null;
        createdAt: Date;
        triggeredBy: string;
        runDuration: number | null;
      }>;
    }>;
  };
  members: (Member & { user: User })[];
  onClick: (taskId: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (taskId: string, checked: boolean) => void;
}

export function ModernTaskListItem({
  task,
  members,
  onClick,
  selectable = false,
  selected = false,
  onSelectChange,
}: ModernTaskListItemProps) {
  const member = useMemo(() => {
    if (!task.assigneeId) return null;
    return members.find((m) => m.id === task.assigneeId) ?? null;
  }, [members, task.assigneeId]);
  const isNotRelevant = task.status === 'not_relevant';

  const containerClasses = [
    'group relative flex items-center gap-4 p-4 transition-colors cursor-pointer',
    isNotRelevant
      ? 'opacity-50 bg-slate-100/50 backdrop-blur-md hover:bg-slate-100/60'
      : 'hover:bg-slate-50/50',
    selected ? 'bg-primary/5 ring-1 ring-primary/30' : '',
  ].join(' ');

  return (
    <div
      className={containerClasses}
      onClick={() => {
        if (selectable) {
          onSelectChange?.(task.id, !selected);
        } else {
          onClick(task.id);
        }
      }}
    >
      {isNotRelevant && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold uppercase tracking-[0.15em] text-slate-600">
            NOT RELEVANT
          </span>
        </div>
      )}
      {selectable ? (
        <div
          className="flex shrink-0 items-center"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => {
              onSelectChange?.(task.id, Boolean(checked));
            }}
            aria-label={`Select task ${task.title}`}
          />
        </div>
      ) : null}
      <div
        className="flex shrink-0 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <TaskStatusSelector task={task} />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={`text-sm font-semibold ${isNotRelevant ? 'text-slate-500' : 'text-slate-900'}`}>
              {task.title}
            </div>
            <AutomationIndicator
              automations={task.evidenceAutomations}
              variant="inline"
            />
          </div>
          {task.description && (
            <div className={`mt-0.5 line-clamp-1 text-xs ${isNotRelevant ? 'text-slate-400' : 'text-slate-500'}`}>
              {task.description}
            </div>
          )}
        </div>
        {member && (
          <div className="flex shrink-0 items-center">
            <div className="bg-slate-100 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-200">
              {member.user?.image ? (
                <Image
                  src={member.user.image}
                  alt={member.user.name ?? 'Assignee'}
                  width={32}
                  height={32}
                  className="object-cover"
                />
              ) : (
                <span className="text-slate-600 text-xs font-medium">
                  {member.user?.name?.charAt(0) ?? '?'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}