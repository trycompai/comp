'use client';

import { Button } from '@comp/ui/button';
import type { Task, TaskStatus } from '@db';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import { PropertySelector } from '../[taskId]/components/PropertySelector';
import { taskStatuses } from '../[taskId]/components/constants';
import { updateTaskStatusAction } from '../actions/updateTaskStatus';
import { TaskStatusIndicator } from './TaskStatusIndicator';

interface TaskStatusSelectorProps {
  task: Task;
}

export function TaskStatusSelector({ task }: TaskStatusSelectorProps) {
  const { execute, status } = useAction(updateTaskStatusAction, {
    onSuccess: (res) => {
      if (res?.data.success) {
        return;
      } else {
        console.error('Failed to update task status:', res?.data.error);
        toast.error(`Failed to update task status: ${res?.data.error || 'Unknown error'}`);
      }
    },
    onError: (error) => {
      console.error('Failed to update task status:', error);
      toast.error('Failed to update task status.');
    },
  });

  const isUpdating = status === 'executing';

  const handleStatusSelect = (selectedStatus: TaskStatus | null) => {
    if (selectedStatus && selectedStatus !== task.status) {
      execute({
        id: task.id,
        status: selectedStatus,
      });
    }
  };

  return (
    <PropertySelector<TaskStatus>
      value={task.status}
      options={taskStatuses}
      getKey={(status) => status}
      renderOption={(status) => (
        <div className="flex items-center gap-2">
          <TaskStatusIndicator status={status} />
          <span className="capitalize">{status.replace('_', ' ')}</span>
        </div>
      )}
      onSelect={(selectedValue) => {
        handleStatusSelect(selectedValue as TaskStatus);
      }}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-muted data-[state=open]:bg-muted flex h-8 w-6 shrink-0 items-center justify-center p-0"
          onClick={(e) => {
            e.stopPropagation();
          }}
          disabled={isUpdating}
          aria-label={`Change status for ${task.title}`}
        >
          <TaskStatusIndicator status={task.status as TaskStatus} />
        </Button>
      }
      searchPlaceholder="Change status..."
      emptyText="No status found."
      contentWidth="w-48"
      disabled={isUpdating}
    />
  );
}
