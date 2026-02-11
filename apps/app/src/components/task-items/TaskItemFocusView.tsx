'use client';

import { useOptimisticTaskItems } from '@/hooks/use-task-items';
import { useAssignableMembers } from '@/hooks/use-organization-members';
import { filterMembersByOwnerOrAdmin } from '@/utils/filter-members-by-role';
import { Button } from '@comp/ui/button';
import type {
  TaskItem,
  TaskItemEntityType,
  TaskItemFilters,
  TaskItemPriority,
  TaskItemSortBy,
  TaskItemSortOrder,
  TaskItemStatus,
} from '@/hooks/use-task-items';
import { ChevronsLeft, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { TaskItemActivityTimeline } from './TaskItemActivityTimeline';
import { TaskItemFocusSidebar } from './TaskItemFocusSidebar';
import { getTaskIdShort } from './task-item-utils';
import { Comments } from '../comments/Comments';
import { CommentEntityType } from '@db';
import { usePermissions } from '@/hooks/use-permissions';
import { CustomTaskItemMainContent } from './custom-task/CustomTaskItemMainContent';

interface TaskItemFocusViewProps {
  taskItem: TaskItem;
  entityId: string;
  entityType: TaskItemEntityType;
  page?: number;
  limit?: number;
  sortBy?: TaskItemSortBy;
  sortOrder?: TaskItemSortOrder;
  filters?: TaskItemFilters;
  onBack: () => void;
  onStatusOrPriorityChange?: () => void;
}

export function TaskItemFocusView({
  taskItem,
  entityId,
  entityType,
  page = 1,
  limit = 5,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  filters = {},
  onBack,
  onStatusOrPriorityChange,
}: TaskItemFocusViewProps) {
  const { hasPermission } = usePermissions();
  const canUpdateTask = hasPermission('task', 'update');
  const canDeleteTask = hasPermission('task', 'delete');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTaskId, setCopiedTaskId] = useState(false);
  const [refreshActivity, setRefreshActivity] = useState<(() => void) | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const pathname = usePathname();

  const { optimisticUpdate, optimisticDelete } = useOptimisticTaskItems(
    entityId,
    entityType,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  );
  const { members } = useAssignableMembers();

  const assignableMembers = useMemo(() => {
    if (!members) return [];
    return filterMembersByOwnerOrAdmin({
      members,
      currentAssigneeId: taskItem.assignee?.id || null,
    });
  }, [members, taskItem.assignee?.id]);

  const handleUpdate = async (updates: { title?: string; description?: string }) => {
    setIsUpdating(true);
    try {
      await optimisticUpdate(taskItem.id, updates);
      // Refresh activity timeline
      refreshActivity?.();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskItemStatus) => {
    if (newStatus === taskItem.status) return;

    try {
      await optimisticUpdate(taskItem.id, { status: newStatus });
      toast.success('Status updated');
      onStatusOrPriorityChange?.();
      // Refresh activity timeline
      refreshActivity?.();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (newPriority: TaskItemPriority) => {
    if (newPriority === taskItem.priority) return;

    try {
      await optimisticUpdate(taskItem.id, { priority: newPriority });
      toast.success('Priority updated');
      onStatusOrPriorityChange?.();
      // Refresh activity timeline
      refreshActivity?.();
    } catch (error) {
      toast.error('Failed to update priority');
    }
  };

  const handleDeleteTaskItem = async () => {
    setIsDeleting(true);
    try {
      await optimisticDelete(taskItem.id);
      toast.success('Task deleted successfully');
      setIsDeleteOpen(false);
      onStatusOrPriorityChange?.();
      onBack(); // Navigate back after deletion
    } catch (error) {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = async () => {
    const taskUrl = `${window.location.origin}${pathname}?taskItemId=${taskItem.id}`;
    try {
      await navigator.clipboard.writeText(taskUrl);
      setCopiedLink(true);
      toast.success('Task link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyTaskId = async () => {
    try {
      const shortId = getTaskIdShort(taskItem.id);
      await navigator.clipboard.writeText(shortId);
      setCopiedTaskId(true);
      toast.success('Task ID copied to clipboard');
      setTimeout(() => setCopiedTaskId(false), 2000);
    } catch (error) {
      toast.error('Failed to copy task ID');
    }
  };

  return (
    <>
      <div className="flex gap-6 transition-all duration-300 ease-in-out">
        {/* Main Content */}
        <div className="flex-1 space-y-6 min-w-0">
            <CustomTaskItemMainContent
            taskItem={taskItem}
            isUpdating={isUpdating}
            onUpdate={handleUpdate}
            onStatusOrPriorityChange={onStatusOrPriorityChange}
            entityId={entityId}
            entityType={entityType}
            readOnly={!canUpdateTask}
          />

          {/* Divider */}
          <div className="border-t border-border" />

          <TaskItemActivityTimeline 
            taskItem={taskItem}
            onActivityLoaded={(mutate) => setRefreshActivity(() => mutate)}
          />

          {/* Divider */}
          <div className="border-t border-border" />

          <Comments
            entityId={taskItem.id}
            entityType={CommentEntityType.task}
            description="Add comments, ask questions, or share updates about this task"
          />
        </div>

        <TaskItemFocusSidebar
          taskItem={taskItem}
          assignableMembers={assignableMembers}
          isUpdating={isUpdating}
          copiedLink={copiedLink}
          copiedTaskId={copiedTaskId}
          isCollapsed={isSidebarCollapsed}
          readOnly={!canUpdateTask}
          canDelete={canDeleteTask}
          onCopyLink={handleCopyLink}
          onCopyTaskId={handleCopyTaskId}
          onDelete={() => setIsDeleteOpen(true)}
          onCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onAssigneeChange={async (newAssigneeId) => {
            await optimisticUpdate(taskItem.id, { assigneeId: newAssigneeId });
            // Refresh activity timeline
            refreshActivity?.();
          }}
          onStatusOrPriorityChange={onStatusOrPriorityChange}
        />
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && setIsDeleteOpen(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTaskItem} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

