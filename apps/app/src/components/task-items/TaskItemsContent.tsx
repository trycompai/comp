'use client';

import { Button } from '@comp/ui/button';
import { Loader2 } from 'lucide-react';
import { TaskItemList } from './TaskItemList';
import { TaskItemPagination } from './TaskItemPagination';
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
    <div className="space-y-4">
      {taskItemsError && (
        <div className="text-destructive text-sm">
          Failed to load tasks. Please try again.
        </div>
      )}

      {shouldShowEmptyState ? (
        <div className="text-muted-foreground text-sm text-center py-8">
          {hasActiveFilters ? (
            <div className="flex flex-col items-center gap-2">
              <p>No tasks match the current filters.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-8"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            'No tasks yet. Use the plus button to create one.'
          )}
        </div>
      ) : taskItems.length > 0 ? (
        <>
          <div className="relative">
            {taskItemsLoading && taskItems.length > 0 && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              </div>
            )}
            <TaskItemList
              taskItems={taskItems}
              entityId={entityId}
              entityType={entityType}
              page={page}
              limit={limit}
              sortBy={sortBy}
              sortOrder={sortOrder}
              filters={filters}
              selectedTaskItemId={selectedTaskItemId}
              onSelectTaskItemId={onSelectTaskItemId}
              onStatusOrPriorityChange={onStatusOrPriorityChange}
            />
          </div>
          {paginationMeta && (
            <TaskItemPagination
              page={paginationMeta.page}
              limit={paginationMeta.limit}
              total={paginationMeta.total}
              totalPages={paginationMeta.totalPages}
              hasNextPage={paginationMeta.hasNextPage}
              hasPrevPage={paginationMeta.hasPrevPage}
              onPageChange={onPageChange}
              onLimitChange={onLimitChange}
            />
          )}
        </>
      ) : null}
    </div>
  );
}

