'use client';

import { Button, Spinner, Stack, Text } from '@trycompai/design-system';
import { TaskItemList } from './TaskItemList';
import type { TaskItem, TaskItemEntityType, TaskItemFilters, TaskItemSortBy, TaskItemSortOrder } from '@/hooks/use-task-items';

interface TaskItemsContentProps {
  taskItemsError: Error | null | undefined;
  shouldShowEmptyState: boolean;
  hasActiveFilters: boolean | undefined;
  taskItems: TaskItem[];
  taskItemsLoading: boolean;
  paginationMeta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  entityId: string;
  entityType: TaskItemEntityType;
  page: number;
  limit: number;
  sortBy: TaskItemSortBy;
  sortOrder: TaskItemSortOrder;
  filters: TaskItemFilters;
  selectedTaskItemId: string | null;
  onSelectTaskItemId: (taskItemId: string | null) => void;
  onStatusOrPriorityChange: () => void;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onClearFilters: () => void;
}

export function TaskItemsContent({
  taskItemsError,
  shouldShowEmptyState,
  hasActiveFilters,
  taskItems,
  taskItemsLoading,
  paginationMeta,
  entityId,
  entityType,
  page,
  limit,
  sortBy,
  sortOrder,
  filters,
  selectedTaskItemId,
  onSelectTaskItemId,
  onStatusOrPriorityChange,
  onPageChange,
  onLimitChange,
  onClearFilters,
}: TaskItemsContentProps) {
  return (
    <Stack gap="md">
      {taskItemsError && (
        <Text size="sm" variant="destructive">
          Failed to load tasks. Please try again.
        </Text>
      )}

      {shouldShowEmptyState ? (
        <Stack gap="sm" align="center">
          {hasActiveFilters ? (
            <Stack gap="xs" align="center">
              <Text size="sm" variant="muted">
                No tasks match the current filters.
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
              >
                Clear filters
              </Button>
            </Stack>
          ) : (
            <Text size="sm" variant="muted">
              No tasks yet. Use the plus button to create one.
            </Text>
          )}
        </Stack>
      ) : taskItems.length > 0 ? (
        <>
          <div className="relative">
            {taskItemsLoading && taskItems.length > 0 && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                <Stack gap="xs" align="center">
                  <Spinner />
                  <Text size="xs" variant="muted">
                    Loading...
                  </Text>
                </Stack>
              </div>
            )}
          <TaskItemList
            taskItems={taskItems}
            entityId={entityId}
            entityType={entityType}
            paginationMeta={
              paginationMeta
                ? {
                    page: paginationMeta.page,
                    limit: paginationMeta.limit,
                    totalPages: paginationMeta.totalPages,
                  }
                : undefined
            }
            page={page}
            limit={limit}
            sortBy={sortBy}
            sortOrder={sortOrder}
            filters={filters}
            selectedTaskItemId={selectedTaskItemId}
            onSelectTaskItemId={onSelectTaskItemId}
            onStatusOrPriorityChange={onStatusOrPriorityChange}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
          />
        </div>
        </>
      ) : null}
    </Stack>
  );
}

