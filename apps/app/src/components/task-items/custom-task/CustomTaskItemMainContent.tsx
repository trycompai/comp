'use client';

import type { TaskItem, TaskItemEntityType } from '@/hooks/use-task-items';
import { Card, CardContent, CardHeader, HStack, Stack, Text } from '@trycompai/design-system';
import { TaskItemEditableTitle } from '../TaskItemEditableTitle';
import { TaskItemEditableDescription } from '../TaskItemEditableDescription';
import { Document, TextAlignLeft } from '@trycompai/design-system/icons';

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
    <Stack gap="lg">
      <Card>
        <CardContent>
          <HStack gap="sm" align="center">
            <Document className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <TaskItemEditableTitle
                title={taskItem.title}
                isUpdating={isUpdating}
                onUpdate={onUpdate}
                onAfterUpdate={onStatusOrPriorityChange}
                className="text-lg"
              />
            </div>
          </HStack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <HStack gap="xs" align="center">
            <TextAlignLeft className="h-4 w-4" />
            <Text size="sm" weight="semibold">
              Description
            </Text>
          </HStack>
        </CardHeader>
        <CardContent>
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
    </Stack>
  );
}


