import { TaskItemItem } from './TaskItemItem';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@trycompai/design-system';
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
  paginationMeta?: {
    page: number;
    limit: number;
    totalPages: number;
  };
  page?: number;
  limit?: number;
  sortBy?: TaskItemSortBy;
  sortOrder?: TaskItemSortOrder;
  filters?: TaskItemFilters;
  selectedTaskItemId?: string | null;
  onSelectTaskItemId?: (taskItemId: string | null) => void;
  onStatusOrPriorityChange?: () => void;
  onPageChange?: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
}

export function TaskItemList({
  taskItems,
  entityId,
  entityType,
  paginationMeta,
  page = 1,
  limit = 5,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  filters = {},
  selectedTaskItemId = null,
  onSelectTaskItemId,
  onStatusOrPriorityChange,
  onPageChange,
  onLimitChange,
}: TaskItemListProps) {
  return (
    <Table
      variant="bordered"
      pagination={
        paginationMeta && onPageChange && onLimitChange
          ? {
              page: paginationMeta.page,
              pageCount: Math.max(1, paginationMeta.totalPages),
              onPageChange,
              pageSize: paginationMeta.limit,
              pageSizeOptions: [5, 10, 25, 50],
              onPageSizeChange: onLimitChange,
            }
          : undefined
      }
    >
      <TableHeader>
        <TableRow>
          <TableHead>Priority</TableHead>
          <TableHead>Task</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
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
            isExpanded={selectedTaskItemId === taskItem.id}
            onToggleExpanded={() =>
              onSelectTaskItemId?.(selectedTaskItemId === taskItem.id ? null : taskItem.id)
            }
            onStatusOrPriorityChange={onStatusOrPriorityChange}
          />
        ))}
      </TableBody>
    </Table>
  );
}

