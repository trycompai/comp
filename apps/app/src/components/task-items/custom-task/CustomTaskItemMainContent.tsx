'use client';

import type { TaskItem, TaskItemEntityType } from '@/hooks/use-task-items';
import { TaskItemEditableTitle } from '../TaskItemEditableTitle';
import { TaskItemEditableDescription } from '../TaskItemEditableDescription';
import { Document, TextAlignLeft } from '@trycompai/design-system/icons';
import { Text } from '@trycompai/design-system';

interface CustomTaskItemMainContentProps {
  taskItem: TaskItem;
  isUpdating: boolean;
  onUpdate: (updates: { title?: string; description?: string }) => Promise<void>;
  onStatusOrPriorityChange?: () => void;
  entityId: string;
  entityType: TaskItemEntityType;
  readOnly?: boolean;
}

export function CustomTaskItemMainContent({
  taskItem,
  isUpdating,
  onUpdate,
  onStatusOrPriorityChange,
  entityId,
  entityType,
  readOnly,
}: CustomTaskItemMainContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Document className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <TaskItemEditableTitle
            title={taskItem.title}
            isUpdating={isUpdating}
            onUpdate={onUpdate}
            onAfterUpdate={onStatusOrPriorityChange}
            className="text-lg"
            readOnly={readOnly}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <TextAlignLeft className="h-4 w-4" />
          <Text size="sm" weight="semibold">Description</Text>
        </div>
        <TaskItemEditableDescription
          taskItem={taskItem}
          isUpdating={isUpdating}
          onUpdate={onUpdate}
          onAfterUpdate={onStatusOrPriorityChange}
          entityId={entityId}
          entityType={entityType}
          descriptionMaxHeightClass="max-h-96"
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
