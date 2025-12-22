'use client';

import { TaskSmartForm } from './TaskSmartForm';
import type {
  TaskItemEntityType,
  TaskItemFilters,
  TaskItemSortBy,
  TaskItemSortOrder,
} from '@/hooks/use-task-items';

interface TaskItemFormProps {
  entityId: string;
  entityType: TaskItemEntityType;
  page?: number;
  limit?: number;
  sortBy?: TaskItemSortBy;
  sortOrder?: TaskItemSortOrder;
  filters?: TaskItemFilters;
  onSuccess?: () => void;
  onCancel?: () => void;
}


export function TaskItemForm(props: TaskItemFormProps) {
  return <TaskSmartForm {...props} mode="create" />;
}

