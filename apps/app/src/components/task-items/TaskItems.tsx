'use client';

import { useTaskItems, useTaskItemsStats, type TaskItemSortBy, type TaskItemSortOrder, type TaskItemFilters, type TaskItemStatus, type TaskItemPriority } from '@/hooks/use-task-items';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Badge } from '@comp/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import type { TaskItemEntityType } from '@/hooks/use-task-items';
import { Plus, X, Loader2, ArrowUpDown, Filter, Flag, Users } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TaskItemForm } from './TaskItemForm';
import { TaskItemList } from './TaskItemList';
import { TaskItemPagination } from './TaskItemPagination';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { filterMembersByOwnerOrAdmin } from '@/utils/filter-members-by-role';

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
}: TaskItemsProps) => {
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [sortBy, setSortBy] = useState<TaskItemSortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<TaskItemSortOrder>('desc');
  const [filters, setFilters] = useState<TaskItemFilters>({});
  const previousDataRef = useRef<typeof taskItemsResponse>(undefined);

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

  const hasActiveFilters = filters.status || filters.priority || filters.assigneeId;

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

  const content = (
    <div className="space-y-4">
      {showForm && (
        <TaskItemForm
          entityId={entityId}
          entityType={entityType}
          page={page}
          limit={limit}
          onSuccess={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

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
                onClick={() => setFilters({})}
                className="h-8"
              >
                Clear filters
              </Button>
            </div>
          ) : showForm ? (
            'Fill out the form above to create your first task.'
          ) : (
            'No tasks yet. Click the icon above to create one.'
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
              onStatusOrPriorityChange={refreshStats}
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
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          )}
        </>
      ) : null}
    </div>
  );

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
          content
        )}
      </section>
    );
  }

  return (
    <section id={anchorId} className="scroll-mt-24">
      <Card>
        <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Title and Create Button Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle>{title}</CardTitle>
                {statsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  stats && stats.total > 0 && (
                    <Badge variant="secondary" className="tabular-nums">
                      {stats.total}
                    </Badge>
                  )
                )}
              </div>
              <CardDescription className="mt-1">{defaultDescription}</CardDescription>
              {!statsLoading && stats && stats.total > 0 && (
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {stats.byStatus.todo > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {stats.byStatus.todo} Todo
                      </span>
                    </div>
                  )}
                  {stats.byStatus.in_progress > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                      <span className="text-xs text-muted-foreground">
                        {stats.byStatus.in_progress} In Progress
                      </span>
                    </div>
                  )}
                  {stats.byStatus.in_review > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400" />
                      <span className="text-xs text-muted-foreground">
                        {stats.byStatus.in_review} In Review
                      </span>
                    </div>
                  )}
                  {stats.byStatus.done > 0 && (
                    <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-xs text-muted-foreground">
                        {stats.byStatus.done} Done
                      </span>
                    </div>
                  )}
                  {stats.byStatus.canceled > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {stats.byStatus.canceled} Canceled
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button
              size="icon"
              onClick={() => setShowForm(!showForm)}
              variant={showForm ? 'outline' : 'default'}
              aria-label={showForm ? 'Cancel' : 'Create Task'}
              className="transition-all duration-200 flex-shrink-0"
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

          {/* Sort and Filter Controls Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={handleSortChange}
              disabled={!hasTasks || statsLoading}
            >
              <SelectTrigger className="h-9 w-[190px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
                <SelectItem value="updatedAt-asc">Least Updated</SelectItem>
                <SelectItem value="priority-desc">Priority Low-High</SelectItem>
                <SelectItem value="priority-asc">Priority High-Low</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value === 'all' ? null : value)}
              disabled={!hasTasks || statsLoading}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.priority || 'all'}
              onValueChange={(value) => handleFilterChange('priority', value === 'all' ? null : value)}
              disabled={!hasTasks || statsLoading}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    <span>All Priority</span>
                  </div>
                </SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {assignableMembers && assignableMembers.length > 0 && (
              <Select
                value={filters.assigneeId === '__unassigned__' ? 'unassigned' : filters.assigneeId || 'all'}
                onValueChange={(value) => handleFilterChange('assigneeId', value === 'all' ? null : value)}
                disabled={!hasTasks || statsLoading}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>All Assignees</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.user.name || member.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({})}
                className="h-9"
                disabled={!hasTasks || statsLoading}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
        </CardHeader>
        <CardContent>
        {isInitialLoad ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          </div>
        ) : (
          content
        )}
        </CardContent>
      </Card>
    </section>
  );
};

