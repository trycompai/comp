import { TaskItemItem } from './TaskItemItem';
import type {
  TaskItem,
  TaskItemEntityType,
  TaskItemFilters,
  TaskItemSortBy,
  TaskItemSortOrder,
} from '@/hooks/use-task-items';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';

interface TaskItemListProps {
  taskItems: TaskItem[];
  entityId: string;
  entityType: TaskItemEntityType;
  page?: number;
  limit?: number;
  sortBy?: TaskItemSortBy;
  sortOrder?: TaskItemSortOrder;
  filters?: TaskItemFilters;
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
  onSelectTaskItemId,
  onStatusOrPriorityChange,
}: TaskItemListProps) {
  if (taskItems.length === 0) {
    return (
      <div className="py-8 text-center">
        <Text size="sm" variant="muted">No tasks yet.</Text>
      </div>
    );
  }

  return (
    <Table variant="bordered">
      <TableHeader>
        <TableRow>
          <TableHead>NAME</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>PRIORITY</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead>CREATED</TableHead>
          <TableHead>ACTIONS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
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
            onSelect={() => onSelectTaskItemId?.(taskItem.id)}
            onStatusOrPriorityChange={onStatusOrPriorityChange}
          />
        ))}
      </TableBody>
    </Table>
  );
}
