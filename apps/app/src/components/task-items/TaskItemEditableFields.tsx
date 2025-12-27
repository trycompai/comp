'use client';

import type { TaskItem } from '@/hooks/use-task-items';
import { TaskItemEditableDescription } from './TaskItemEditableDescription';
import { TaskItemEditableTitle } from './TaskItemEditableTitle';

interface TaskItemEditableFieldsProps {
  taskItem: TaskItem;
  isUpdating: boolean;
  onUpdate: (updates: { title?: string; description?: string }) => Promise<void>;
  onStatusOrPriorityChange?: () => void;
  entityId: string;
  entityType: 'risk' | 'vendor';
  /**
   * Optional max-height class (e.g. "max-h-80") to constrain long descriptions
   * and enable internal scrolling in read-only mode.
   */
  descriptionMaxHeightClass?: string;
}

export function TaskItemEditableFields({
  taskItem,
  isUpdating,
  onUpdate,
  onStatusOrPriorityChange,
  entityId,
  entityType,
  descriptionMaxHeightClass,
}: TaskItemEditableFieldsProps) {
  return (
    <>
      <TaskItemEditableTitle
        title={taskItem.title}
        isUpdating={isUpdating}
        onUpdate={onUpdate}
        onAfterUpdate={onStatusOrPriorityChange}
      />

      <TaskItemEditableDescription
        taskItem={taskItem}
        isUpdating={isUpdating}
        onUpdate={onUpdate}
        onAfterUpdate={onStatusOrPriorityChange}
        entityId={entityId}
        entityType={entityType}
        descriptionMaxHeightClass={descriptionMaxHeightClass}
      />
    </>
  );
}

