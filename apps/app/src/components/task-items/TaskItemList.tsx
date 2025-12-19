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
          onStatusOrPriorityChange={onStatusOrPriorityChange}
        />
      ))}
    </div>
  );
}

