'use client';

import { useOptimisticTaskItems } from '@/hooks/use-task-items';
import { useAssignableMembers } from '@/hooks/use-organization-members';
import { filterMembersByOwnerOrAdmin } from '@/utils/filter-members-by-role';
import type {
  TaskItem,
  TaskItemEntityType,
  TaskItemFilters,
  TaskItemPriority,
  TaskItemSortBy,
  TaskItemSortOrder,
  TaskItemStatus,
} from '@/hooks/use-task-items';
import {
  TrashCan,
  OverflowMenuVertical,
} from '@trycompai/design-system/icons';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  TableCell,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/use-permissions';
import { StatusIndicator } from '@/components/status-indicator';

const formatShortDate = (date: string | Date): string => {
  try {
    return format(typeof date === 'string' ? new Date(date) : date, 'MMM d');
  } catch {
    return '';
  }
};

const PRIORITY_LABEL: Record<TaskItemPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

interface TaskItemItemProps {
  taskItem: TaskItem;
  entityId: string;
  entityType: TaskItemEntityType;
  page?: number;
  limit?: number;
  sortBy?: TaskItemSortBy;
  sortOrder?: TaskItemSortOrder;
  filters?: TaskItemFilters;
  onSelect?: () => void;
  onStatusOrPriorityChange?: () => void;
}

export function TaskItemItem({
  taskItem,
  entityId,
  entityType,
  page = 1,
  limit = 5,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  filters = {},
  onSelect,
  onStatusOrPriorityChange,
}: TaskItemItemProps) {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('task', 'update');
  const canDelete = hasPermission('task', 'delete');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { optimisticUpdate, optimisticDelete } = useOptimisticTaskItems(
    entityId, entityType, page, limit, sortBy, sortOrder, filters,
  );
  const { members } = useAssignableMembers();

  const assignableMembers = useMemo(() => {
    if (!members) return [];
    return filterMembersByOwnerOrAdmin({
      members,
      currentAssigneeId: taskItem.assignee?.id || null,
    });
  }, [members, taskItem.assignee?.id]);

  const handleStatusChange = async (newStatus: TaskItemStatus) => {
    if (newStatus === taskItem.status) return;
    try {
      await optimisticUpdate(taskItem.id, { status: newStatus });
      toast.success('Status updated');
      onStatusOrPriorityChange?.();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (newPriority: TaskItemPriority) => {
    if (newPriority === taskItem.priority) return;
    try {
      await optimisticUpdate(taskItem.id, { priority: newPriority });
      toast.success('Priority updated');
      onStatusOrPriorityChange?.();
    } catch {
      toast.error('Failed to update priority');
    }
  };

  const handleAssigneeChange = async (assigneeId: string | null) => {
    try {
      await optimisticUpdate(taskItem.id, { assigneeId });
      toast.success('Assignee updated');
      onStatusOrPriorityChange?.();
    } catch {
      toast.error('Failed to update assignee');
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await optimisticDelete(taskItem.id);
      toast.success('Task deleted');
      setDeleteDialogOpen(false);
      onStatusOrPriorityChange?.();
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const assignee = taskItem.assignee?.user;

  return (
    <>
      <TableRow
        onClick={() => onSelect?.()}
        style={{ cursor: 'pointer' }}
      >
        <TableCell>
          <Text size="sm">{taskItem.title}</Text>
        </TableCell>

        <TableCell>
          <StatusIndicator status={taskItem.status as 'todo' | 'in_progress' | 'in_review' | 'done'} />
        </TableCell>

        <TableCell>
          <Text size="sm">{PRIORITY_LABEL[taskItem.priority]}</Text>
        </TableCell>

        <TableCell>
          {assignee ? (
            <HStack gap="2" align="center">
              <Avatar size="sm">
                <AvatarImage src={assignee.image || ''} alt={assignee.name || ''} />
                <AvatarFallback>
                  {assignee.name ? assignee.name.charAt(0).toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <Text size="sm">{assignee.name || assignee.email}</Text>
            </HStack>
          ) : (
            <Text size="sm" variant="muted">None</Text>
          )}
        </TableCell>

        <TableCell>
          <Text size="sm" variant="muted">{formatShortDate(taskItem.createdAt)}</Text>
        </TableCell>

        <TableCell>
          {canDelete && (
            <div className="flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger
                  variant="ellipsis"
                  onClick={(e) => e.stopPropagation()}
                >
                  <OverflowMenuVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <TrashCan size={16} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </TableCell>
      </TableRow>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{taskItem.title}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
