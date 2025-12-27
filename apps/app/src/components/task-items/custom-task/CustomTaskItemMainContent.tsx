'use client';

import type { TaskItem, TaskItemEntityType } from '@/hooks/use-task-items';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { TaskItemEditableTitle } from '../TaskItemEditableTitle';
import { TaskItemEditableDescription } from '../TaskItemEditableDescription';
import { FileText, AlignLeft } from 'lucide-react';

interface CustomTaskItemMainContentProps {
  taskItem: TaskItem;
  isUpdating: boolean;
  onUpdate: (updates: { title?: string; description?: string }) => Promise<void>;
  onStatusOrPriorityChange?: () => void;
  entityId: string;
  entityType: TaskItemEntityType;
}

/**
 * Beautiful UI for user-created tasks.
 *
 * Features:
 * - Clean card-based layout
 * - Editable title + description
 * - Mentions, attachments, rich text
 * - Proper spacing and visual hierarchy
 */
export function CustomTaskItemMainContent({
  taskItem,
  isUpdating,
  onUpdate,
  onStatusOrPriorityChange,
  entityId,
  entityType,
}: CustomTaskItemMainContentProps) {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-none">
        <CardContent className="pt-6 px-0 pb-3">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <TaskItemEditableTitle
                title={taskItem.title}
                isUpdating={isUpdating}
                onUpdate={onUpdate}
                onAfterUpdate={onStatusOrPriorityChange}
                className="text-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-1">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlignLeft className="h-4 w-4" />
            Description
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <TaskItemEditableDescription
            taskItem={taskItem}
            isUpdating={isUpdating}
            onUpdate={onUpdate}
            onAfterUpdate={onStatusOrPriorityChange}
            entityId={entityId}
            entityType={entityType}
            descriptionMaxHeightClass="max-h-96"
          />
        </CardContent>
      </Card>
    </div>
  );
}


