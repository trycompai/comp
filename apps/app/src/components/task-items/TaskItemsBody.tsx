'use client';

import type { TaskItem, TaskItemEntityType, TaskItemFilters, TaskItemSortBy, TaskItemSortOrder } from '@/hooks/use-task-items';
import { Spinner, Stack, Text } from '@trycompai/design-system';
import React from 'react';
import { TaskItemsContent } from './TaskItemsContent';

interface TaskItemsBodyProps {
  isInitialLoad: boolean;
  taskItemsError: Error | null | undefined;
  shouldShowEmptyState: boolean;
  hasActiveFilters: boolean;
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

export function TaskItemsBody({
  isInitialLoad,
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
}: TaskItemsBodyProps) {
  if (isInitialLoad) {
    return (
      <Stack gap="sm" align="center">
        <Spinner />
        <Text size="sm" variant="muted">
          Loading tasks...
        </Text>
      </Stack>
    );
  }

  return (
    <TaskItemsContent
      taskItemsError={taskItemsError}
      shouldShowEmptyState={shouldShowEmptyState}
      hasActiveFilters={hasActiveFilters}
      taskItems={taskItems}
      taskItemsLoading={taskItemsLoading}
      paginationMeta={paginationMeta}
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
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
      onClearFilters={onClearFilters}
    />
  );
}

