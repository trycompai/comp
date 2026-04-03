'use client';

import {
  useTaskItems,
  useTaskItemsStats,
  type TaskItemSortBy,
  type TaskItemSortOrder,
  type TaskItemFilters,
  type TaskItemStatus,
  type TaskItemPriority,
  type TaskItemEntityType,
} from '@/hooks/use-task-items';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TaskItemFocusView } from './TaskItemFocusView';
import { TaskItemCreateDialog } from './TaskItemCreateDialog';
import { TaskItemList } from './TaskItemList';
import { useAssignableMembers } from '@/hooks/use-organization-members';
import { filterMembersByOwnerOrAdmin } from '@/utils/filter-members-by-role';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Button,
  DataTableFilters,
  DataTableHeader,
  DataTableSearch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Text,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Loader2 } from 'lucide-react';


interface TaskItemsProps {
  entityId: string;
  entityType: TaskItemEntityType;
  title?: string;
  description?: string;
  anchorId?: string;
  onFocusModeChange?: (isFocusMode: boolean) => void;
}

export const TaskItems = ({
  entityId,
  entityType,
  title = 'Tasks',
  description,
  anchorId = 'task-items',
  onFocusModeChange,
}: TaskItemsProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [sortBy, setSortBy] = useState<TaskItemSortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<TaskItemSortOrder>('desc');
  const [filters, setFilters] = useState<TaskItemFilters>({});
  const [search, setSearch] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedTaskItemId, setSelectedTaskItemId] = useState<string | null>(
    () => searchParams.get('taskItemId') ?? null,
  );
  const previousDataRef = useRef<typeof taskItemsResponse>(undefined);
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('task', 'create');

  const {
    data: taskItemsResponse,
    error: taskItemsError,
    isLoading: taskItemsLoading,
    mutate: refreshTaskItems,
  } = useTaskItems(entityId, entityType, page, limit, sortBy, sortOrder, filters);

  const { mutate: refreshStats } = useTaskItemsStats(entityId, entityType);
  const { members } = useAssignableMembers();

  const assignableMembers = useMemo(() => {
    if (!members || !Array.isArray(members)) return [];
    const currentAssigneeId: string | null =
      filters.assigneeId && filters.assigneeId !== '__unassigned__' ? filters.assigneeId : null;
    return filterMembersByOwnerOrAdmin({ members, currentAssigneeId });
  }, [members, filters.assigneeId]);

  const handleFilterChange = (filterType: 'status' | 'priority' | 'assigneeId', value: string | null) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === null || value === 'all') {
        delete next[filterType];
      } else if (filterType === 'assigneeId') {
        next.assigneeId = value === 'unassigned' ? '__unassigned__' : value;
      } else if (filterType === 'status') {
        next.status = value as TaskItemStatus;
      } else {
        next.priority = value as TaskItemPriority;
      }
      return next;
    });
    setPage(1);
  };

  useEffect(() => {
    const taskItemIdFromUrl = searchParams.get('taskItemId');
    setSelectedTaskItemId(taskItemIdFromUrl || null);
  }, [searchParams]);

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
    router.replace(`${pathname}${qs ? `?${qs}` : ''}#${anchorId}`, { scroll: false });
  };

  useEffect(() => {
    if (taskItemsResponse) previousDataRef.current = taskItemsResponse;
  }, [taskItemsResponse]);

  const displayResponse = taskItemsResponse || previousDataRef.current;
  const allTaskItems = displayResponse?.data?.data || [];
  const paginationMeta = displayResponse?.data?.meta;
  const isFocusMode = Boolean(selectedTaskItemId);
  const selectedTaskItem =
    allTaskItems.find((t) => t.id === selectedTaskItemId) || null;

  // Client-side search filter
  const filteredTaskItems = useMemo(() => {
    if (!search.trim()) return allTaskItems;
    const q = search.toLowerCase();
    return allTaskItems.filter((t) => t.title.toLowerCase().includes(q));
  }, [allTaskItems, search]);

  // Polling for "Verify risk assessment" generating tasks
  const hasGeneratingTask = useMemo(
    () => allTaskItems.some((t) => t.title === 'Verify risk assessment' && t.status === 'in_progress'),
    [allTaskItems],
  );
  useEffect(() => {
    if (selectedTaskItemId || !hasGeneratingTask) return;
    const interval = setInterval(() => refreshTaskItems(), 3000);
    return () => clearInterval(interval);
  }, [hasGeneratingTask, refreshTaskItems, selectedTaskItemId]);

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    refreshTaskItems();
    refreshStats();
    if (page !== 1) setPage(1);
  };

  // Focus mode
  if (isFocusMode && selectedTaskItem) {
    return (
      <section id={anchorId} className="scroll-mt-24">
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
      </section>
    );
  }

  const isInitialLoad = !taskItemsResponse && !taskItemsError && allTaskItems.length === 0;
  const pageCount = paginationMeta ? Math.max(1, paginationMeta.totalPages) : 1;

  return (
    <section id={anchorId} className="scroll-mt-24">
      <div className="flex flex-col gap-4">
        <DataTableHeader>
          <DataTableSearch placeholder="Search tasks..." value={search} onChange={setSearch} />
          <DataTableFilters>
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => handleFilterChange('status', v === 'all' ? null : v)}
            >
              <SelectTrigger>
                {filters.status ? filters.status.replace('_', ' ') : 'All Status'}
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
              onValueChange={(v) => handleFilterChange('priority', v === 'all' ? null : v)}
            >
              <SelectTrigger>
                {filters.priority || 'All Priority'}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {canCreate && (
              <Button onClick={() => setIsCreateOpen(true)} iconLeft={<Add />}>
                Create Task
              </Button>
            )}
          </DataTableFilters>
        </DataTableHeader>

        {isInitialLoad ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TaskItemList
              taskItems={filteredTaskItems}
              entityId={entityId}
              entityType={entityType}
              page={page}
              limit={limit}
              sortBy={sortBy}
              sortOrder={sortOrder}
              filters={filters}
              onSelectTaskItemId={handleSelectTaskItemId}
              onStatusOrPriorityChange={refreshStats}
            />
            {paginationMeta && paginationMeta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Text size="xs" variant="muted" as="span">
                  Page {page} of {paginationMeta.totalPages}
                </Text>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= paginationMeta.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <TaskItemCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        entityId={entityId}
        entityType={entityType}
        page={page}
        limit={limit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        filters={filters}
        onSuccess={handleCreateSuccess}
      />
    </section>
  );
};
