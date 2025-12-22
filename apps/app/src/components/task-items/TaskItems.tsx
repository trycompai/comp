'use client';

import { useTaskItems, useTaskItemsStats, type TaskItemSortBy, type TaskItemSortOrder, type TaskItemFilters } from '@/hooks/use-task-items';
import { Card, CardContent, CardHeader } from '@comp/ui/card';
import type { TaskItemEntityType } from '@/hooks/use-task-items';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TaskItemFocusView } from './TaskItemFocusView';
import { TaskItemsHeader } from './TaskItemsHeader';
import { TaskItemsFilters } from './TaskItemsFilters';
import { TaskItemCreateDialog } from './TaskItemCreateDialog';
import { TaskItemsInline } from './TaskItemsInline';
import { TaskItemsBody } from './TaskItemsBody';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { filterMembersByOwnerOrAdmin } from '@/utils/filter-members-by-role';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface TaskItemsProps {
  entityId: string;
  entityType: TaskItemEntityType;
  /** Optional custom title for the task items section */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Whether to show as a card or just the content */
  variant?: 'card' | 'inline';
  /** Optional anchor id for deep-linking to this section */
  anchorId?: string;
  /** Callback to notify parent when focus mode changes */
  onFocusModeChange?: (isFocusMode: boolean) => void;
}

export const TaskItems = ({
  entityId,
  entityType,
  title = 'Tasks',
  description,
  variant = 'card',
  anchorId = 'task-items',
  onFocusModeChange,
}: TaskItemsProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [sortBy, setSortBy] = useState<TaskItemSortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<TaskItemSortOrder>('desc');
  const [filters, setFilters] = useState<TaskItemFilters>({});
  const [selectedTaskItemId, setSelectedTaskItemId] = useState<string | null>(
    null,
  );
  const previousDataRef = useRef<typeof taskItemsResponse>(undefined);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    data: taskItemsResponse,
    error: taskItemsError,
    isLoading: taskItemsLoading,
    mutate: refreshTaskItems,
    organizationId: tasksOrgId,
  } = useTaskItems(entityId, entityType, page, limit, sortBy, sortOrder, filters);

  const {
    data: statsResponse,
    isLoading: statsLoading,
    mutate: refreshStats,
    organizationId: statsOrgId,
  } = useTaskItemsStats(entityId, entityType);

  const { members } = useOrganizationMembers();
  
  // Filter members to only show owner and admin roles for assignee filter
  // Always include currently filtered assignee even if they're not owner/admin (to preserve active filter)
  const assignableMembers = useMemo(() => {
    if (!members) return [];
    const currentAssigneeId: string | null = 
      filters.assigneeId && filters.assigneeId !== '__unassigned__' 
        ? (filters.assigneeId as string) 
        : null;
    return filterMembersByOwnerOrAdmin({ members, currentAssigneeId });
  }, [members, filters.assigneeId]);

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('-') as [TaskItemSortBy, TaskItemSortOrder];
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1); // Reset to first page when sorting changes
  };

  const handleFilterChange = (filterType: 'status' | 'priority' | 'assigneeId', value: string | null) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value === null || value === 'all') {
        delete newFilters[filterType];
      } else if (filterType === 'assigneeId' && value === 'unassigned') {
        // Special handling for unassigned - we'll need to handle this in the backend
        // For now, set a special value that backend can interpret
        newFilters[filterType] = '__unassigned__' as any;
      } else {
        newFilters[filterType] = value as any;
      }
      return newFilters;
    });
    setPage(1); // Reset to first page when filter changes
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  // Sync selected task with URL (?taskItemId=...) so breadcrumbs + notification deep-links work.
  useEffect(() => {
    const taskItemIdFromUrl = searchParams.get('taskItemId');
    setSelectedTaskItemId(taskItemIdFromUrl || null);
  }, [searchParams]);

  // Notify parent when focus mode changes
  useEffect(() => {
    onFocusModeChange?.(Boolean(selectedTaskItemId));
  }, [selectedTaskItemId, onFocusModeChange]);

  const handleSelectTaskItemId = (taskItemId: string | null) => {
    setSelectedTaskItemId(taskItemId);
    const next = new URLSearchParams(searchParams.toString());
    if (taskItemId) {
      next.set('taskItemId', taskItemId);
    } else {
      next.delete('taskItemId');
    }

    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}#${anchorId}`, {
      scroll: false,
    });
  };

  // Keep previous data visible while loading new page
  useEffect(() => {
    if (taskItemsResponse) {
      previousDataRef.current = taskItemsResponse;
    }
  }, [taskItemsResponse]);

  const displayResponse = taskItemsResponse || previousDataRef.current;
  const taskItems = displayResponse?.data?.data || [];
  const paginationMeta = displayResponse?.data?.meta;
  const stats = statsResponse?.data;
  const hasTasks = stats && stats.total > 0;
  const isFocusMode = Boolean(selectedTaskItemId);
  const selectedTaskItem = taskItems.find((t) => t.id === selectedTaskItemId) || null;

  // `useApiSWR` doesn't start fetching until organizationId is available, and during that time `isLoading` is false.
  // So we also treat "waiting for org" as initial loading for this section.
  const isWaitingForOrg = !tasksOrgId || !statsOrgId;
  const isInitialLoad =
    isWaitingForOrg || (!taskItemsResponse && !taskItemsError && taskItems.length === 0);
  // Only show empty state if we're not loading AND we have no data AND we've received a response
  const shouldShowEmptyState = !taskItemsLoading && !taskItemsError && taskItems.length === 0 && taskItemsResponse !== undefined;

  const defaultDescription =
    description || `Manage tasks related to this ${entityType}`;

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    refreshTaskItems();
    refreshStats();
    // Reset to first page if we're not on it
    if (page !== 1) {
      setPage(1);
    }
  };

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  };

  // Focus mode: show only the selected task in full view
  if (isFocusMode && selectedTaskItem) {
    return (
      <section id={anchorId} className="scroll-mt-24">
        <Card>
          <CardContent className="p-6">
            <TaskItemFocusView
              taskItem={selectedTaskItem}
              entityId={entityId}
              entityType={entityType}
              page={page}
              limit={limit}
              sortBy={sortBy}
              sortOrder={sortOrder}
              filters={filters}
              onBack={() => handleSelectTaskItemId(null)}
              onStatusOrPriorityChange={refreshStats}
            />
          </CardContent>
        </Card>
      </section>
    );
  }

  const hasActiveFilters = Boolean(filters.status || filters.priority || filters.assigneeId);

  const content = (
    <TaskItemsBody
      isInitialLoad={isInitialLoad}
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
            onSelectTaskItemId={handleSelectTaskItemId}
            onStatusOrPriorityChange={refreshStats}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onClearFilters={handleClearFilters}
          />
  );

  const createDialog = (
    <TaskItemCreateDialog
      open={isCreateOpen}
      onOpenChange={handleCreateOpenChange}
      entityId={entityId}
      entityType={entityType}
      page={page}
      limit={limit}
      sortBy={sortBy}
      sortOrder={sortOrder}
      filters={filters}
      onSuccess={handleCreateSuccess}
    />
  );

  if (variant === 'inline') {
    return (
      <TaskItemsInline
        anchorId={anchorId}
        title={title}
        description={description}
        isCreateOpen={isCreateOpen}
        onToggleCreate={() => setIsCreateOpen((prev) => !prev)}
        content={content}
        createDialog={createDialog}
      />
    );
  }

  return (
    <section id={anchorId} className="scroll-mt-24">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <TaskItemsHeader
              title={title}
              description={defaultDescription}
              statsLoading={statsLoading}
              stats={stats}
              isCreateOpen={isCreateOpen}
              onToggleCreate={() => setIsCreateOpen((prev) => !prev)}
            />
            <TaskItemsFilters
              sortBy={sortBy}
              sortOrder={sortOrder}
              filters={filters}
              assignableMembers={assignableMembers}
              hasTasks={hasTasks ?? false}
              statsLoading={statsLoading}
              onSortChange={handleSortChange}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
      {createDialog}
    </section>
  );
};

