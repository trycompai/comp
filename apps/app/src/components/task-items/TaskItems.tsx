'use client';

import { useTaskItems, useTaskItemsStats, type TaskItemSortBy, type TaskItemSortOrder, type TaskItemFilters } from '@/hooks/use-task-items';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader } from '@comp/ui/card';
import type { TaskItemEntityType } from '@/hooks/use-task-items';
import { Plus, X, Loader2 } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TaskItemFocusView } from './TaskItemFocusView';
import { TaskItemsHeader } from './TaskItemsHeader';
import { TaskItemsFilters } from './TaskItemsFilters';
import { TaskItemsContent } from './TaskItemsContent';
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

/**
 * Reusable TaskItems component that works with any entity type.
 * Automatically handles data fetching, loading states, and error handling.
 *
 * @example
 * // Basic usage
 * <TaskItems entityId={vendorId} entityType="vendor" />
 *
 * @example
 * // Custom title and inline variant
 * <TaskItems
 *   entityId={riskId}
 *   entityType="risk"
 *   title="Risk Tasks"
 *   variant="inline"
 * />
 */
export const TaskItems = ({
  entityId,
  entityType,
  title = 'Tasks',
  description,
  variant = 'card',
  anchorId = 'task-items',
  onFocusModeChange,
}: TaskItemsProps) => {
  const [showForm, setShowForm] = useState(false);
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

  const handleFormSubmit = () => {
    setShowForm(false);
    refreshTaskItems();
    refreshStats();
    // Reset to first page if we're not on it
    if (page !== 1) {
      setPage(1);
    }
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

  const hasActiveFilters = filters.status || filters.priority || filters.assigneeId;

  if (variant === 'inline') {
    return (
      <section id={anchorId} className="scroll-mt-24 space-y-4">
        {title && (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">{title}</h3>
              {description && (
                <p className="text-muted-foreground text-sm mt-1">{description}</p>
              )}
            </div>
            <Button
              size="icon"
              onClick={() => setShowForm(!showForm)}
              variant={showForm ? 'outline' : 'default'}
              aria-label={showForm ? 'Cancel' : 'Create Task'}
              className="transition-all duration-200"
            >
              <span className="relative inline-flex items-center justify-center">
                <Plus
                  className={`h-4 w-4 absolute transition-all duration-200 ${
                    showForm ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                  }`}
                />
                <X
                  className={`h-4 w-4 absolute transition-all duration-200 ${
                    showForm ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                  }`}
                />
              </span>
            </Button>
          </div>
        )}
        {isInitialLoad ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          </div>
        ) : (
          <TaskItemsContent
            showForm={showForm}
            taskItemsError={taskItemsError}
            shouldShowEmptyState={shouldShowEmptyState}
            hasActiveFilters={!!(filters.status || filters.priority || filters.assigneeId)}
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
            onFormSuccess={handleFormSubmit}
            onFormCancel={() => setShowForm(false)}
            onSelectTaskItemId={handleSelectTaskItemId}
            onStatusOrPriorityChange={refreshStats}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onClearFilters={handleClearFilters}
          />
        )}
      </section>
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
              showForm={showForm}
              onToggleForm={() => setShowForm(!showForm)}
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
        <CardContent>
        {isInitialLoad ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          </div>
        ) : (
          <TaskItemsContent
            showForm={showForm}
            taskItemsError={taskItemsError}
            shouldShowEmptyState={shouldShowEmptyState}
            hasActiveFilters={!!(filters.status || filters.priority || filters.assigneeId)}
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
            onFormSuccess={handleFormSubmit}
            onFormCancel={() => setShowForm(false)}
            onSelectTaskItemId={handleSelectTaskItemId}
            onStatusOrPriorityChange={refreshStats}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onClearFilters={handleClearFilters}
          />
        )}
        </CardContent>
      </Card>
    </section>
  );
};

