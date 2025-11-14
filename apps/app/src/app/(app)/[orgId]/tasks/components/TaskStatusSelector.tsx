'use client';

import type { Task, TaskStatus } from '@db';
import { TaskStatusIndicator } from './TaskStatusIndicator';

interface TaskStatusSelectorProps {
  task: Task;
}

export function TaskStatusSelector({ task }: TaskStatusSelectorProps) {
  const status = task.status as TaskStatus;

  return (
    <div className="inline-flex items-center justify-center">
      <TaskStatusIndicator status={status} className="h-4 w-4" />
    </div>
  );
}
