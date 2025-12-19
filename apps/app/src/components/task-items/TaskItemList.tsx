import { TaskItemItem } from './TaskItemItem';
import type {
  TaskItem,
  TaskItemEntityType,
  TaskItemFilters,
  TaskItemSortBy,
  TaskItemSortOrder,
} from '@/hooks/use-task-items';

interface TaskItemListProps {
  taskItems: TaskItem[];
  entityId: string;
  entityType: TaskItemEntityType;
  page?: number;
  limit?: number;
  sortBy?: TaskItemSortBy;
  sortOrder?: TaskItemSortOrder;
  filters?: TaskItemFilters;
  selectedTaskItemId?: string | null;
  onSelectTaskItemId?: (taskItemId: string | null) => void;
  onStatusOrPriorityChange?: () => void;
}

export function TaskItemList({
  taskItems,
  entityId,
  entityType,
  page = 1,
  limit = 5,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  filters = {},
  selectedTaskItemId = null,
  onSelectTaskItemId,
  onStatusOrPriorityChange,
}: TaskItemListProps) {
  return (
    <div className="space-y-2">
      {taskItems.map((taskItem) => (
        <TaskItemItem
          key={taskItem.id}
          taskItem={taskItem}
          entityId={entityId}
          entityType={entityType}
          page={page}
          limit={limit}
          sortBy={sortBy}
          sortOrder={sortOrder}
          filters={filters}
          isExpanded={selectedTaskItemId === taskItem.id}
          onToggleExpanded={() =>
            onSelectTaskItemId?.(selectedTaskItemId === taskItem.id ? null : taskItem.id)
          }
          onStatusOrPriorityChange={onStatusOrPriorityChange}
        />
      ))}
    </div>
  );
}

