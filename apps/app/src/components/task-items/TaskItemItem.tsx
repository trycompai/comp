'use client';

import { useOptimisticTaskItems } from '@/hooks/use-task-items';
import { useAssignableMembers } from '@/hooks/use-organization-members';
import { filterMembersByOwnerOrAdmin } from '@/utils/filter-members-by-role';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
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
  WarningAlt,
  UpToTop,
  Meter,
  ArrowDown,
  TrashCan,
} from '@trycompai/design-system/icons';
import { Button, Text } from '@trycompai/design-system';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/use-permissions';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from './task-item-utils';

const formatShortDate = (date: string | Date): string => {
  try {
    return format(typeof date === 'string' ? new Date(date) : date, 'MMM d');
  } catch {
    return '';
  }
};

const STATUS_DOT: Record<TaskItemStatus, string> = {
  todo: 'border-2 border-muted-foreground/40',
  in_progress: 'border-2 border-yellow-500 bg-yellow-500/30',
  in_review: 'border-2 border-primary bg-primary/30',
  done: 'bg-primary',
  canceled: 'bg-muted-foreground/30',
};

const PRIORITY_ICON: Record<TaskItemPriority, typeof WarningAlt> = {
  urgent: WarningAlt,
  high: UpToTop,
  medium: Meter,
  low: ArrowDown,
};

const PRIORITY_COLOR: Record<TaskItemPriority, string> = {
  urgent: 'text-destructive',
  high: 'text-orange-500',
  medium: 'text-muted-foreground',
  low: 'text-muted-foreground/50',
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
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await optimisticDelete(taskItem.id);
      toast.success('Task deleted');
      setIsDeleteOpen(false);
      onStatusOrPriorityChange?.();
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const assignee = taskItem.assignee?.user;
  const PriorityIcon = PRIORITY_ICON[taskItem.priority];

  return (
    <>
      <div
        className="group flex items-center h-10 px-3 gap-3 cursor-pointer transition-colors hover:bg-muted/50 rounded-sm"
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-stop]')) return;
          onSelect?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(); }
        }}
      >
        {/* Priority icon — clickable */}
        <div data-stop onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!canUpdate}>
              <button type="button" className={`flex items-center focus:outline-none ${PRIORITY_COLOR[taskItem.priority]} ${canUpdate ? 'hover:opacity-70' : ''}`} title={`Priority: ${taskItem.priority}`}>
                <PriorityIcon className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              {PRIORITY_OPTIONS.map((opt) => {
                const Icon = PRIORITY_ICON[opt.value];
                return (
                  <DropdownMenuItem
                    key={opt.value}
                    onSelect={() => handlePriorityChange(opt.value)}
                    className={taskItem.priority === opt.value ? 'bg-accent font-medium' : ''}
                  >
                    <div className={`flex items-center gap-2 ${PRIORITY_COLOR[opt.value]}`}>
                      <Icon className="h-3.5 w-3.5" />
                      <span>{opt.label}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status dot — clickable */}
        <div data-stop onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!canUpdate}>
              <button type="button" className={`h-3.5 w-3.5 rounded-full shrink-0 ${canUpdate ? 'hover:ring-2 hover:ring-offset-1 hover:ring-muted-foreground/20' : ''} ${STATUS_DOT[taskItem.status]}`} title={`Status: ${STATUS_OPTIONS.find(o => o.value === taskItem.status)?.label}`} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onSelect={() => handleStatusChange(opt.value)}
                  className={taskItem.status === opt.value ? 'bg-accent font-medium' : ''}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[opt.value]}`} />
                    <span>{opt.label}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title — fills remaining space */}
        <div className="flex-1 min-w-0">
          <Text size="sm">{taskItem.title}</Text>
        </div>

        {/* Right side: date + assignee */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Assignee avatar — clickable */}
          <div data-stop onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={!canUpdate}>
                <button type="button" className={`focus:outline-none ${canUpdate ? 'cursor-pointer' : ''}`} title={assignee ? (assignee.name || assignee.email) : 'Unassigned'}>
                  <Avatar className={`h-5 w-5 ${canUpdate ? 'hover:ring-2 hover:ring-offset-1 hover:ring-muted-foreground/20' : ''}`}>
                    <AvatarImage src={assignee?.image || ''} alt={assignee?.name || ''} />
                    <AvatarFallback className="text-[9px]">
                      {assignee?.name ? assignee.name.charAt(0).toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onSelect={() => handleAssigneeChange(null)}
                  className={!taskItem.assignee ? 'bg-accent font-medium' : ''}
                >
                  Unassigned
                </DropdownMenuItem>
                {assignableMembers.map((member) => (
                  <DropdownMenuItem
                    key={member.id}
                    onSelect={() => handleAssigneeChange(member.id)}
                    className={taskItem.assignee?.id === member.id ? 'bg-accent font-medium' : ''}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={member.user.image || ''} alt={member.user.name || ''} />
                        <AvatarFallback className="text-[8px]">{member.user.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{member.user.name || member.user.email}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Date */}
          <Text size="xs" variant="muted" as="span">{formatShortDate(taskItem.createdAt)}</Text>

          {/* Delete — hover only */}
          {canDelete && (
            <div
              className="w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              data-stop
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsDeleteOpen(true)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete task"
              >
                <TrashCan className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && setIsDeleteOpen(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>Are you sure? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
