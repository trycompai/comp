'use client';

import { useOptimisticTaskItems } from '@/hooks/use-task-items';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { filterMembersByOwnerOrAdmin } from '@/utils/filter-members-by-role';
import { TaskItemDescriptionView } from './TaskItemDescriptionView';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
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
  MoreHorizontal,
  Pencil,
  Trash2,
  List,
  Clock3,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Gauge,
  ArrowDownRight,
  UserPlus,
  Loader2,
  ChevronDown,
  Circle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SelectAssignee } from '@/components/SelectAssignee';
import { format } from 'date-fns';

const formatShortDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM d');
  } catch {
    return '';
  }
};

const getEntityTypeLabel = (entityType: string): string => {
  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
};

const getTaskIdShort = (taskId: string): string => {
  // Extract last 6 characters from task ID (e.g., "tski_abc123def456" -> "def456")
  return taskId.slice(-6).toUpperCase();
};

const STATUS_OPTIONS: { value: TaskItemStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
  { value: 'canceled', label: 'Canceled' },
];

const PRIORITY_OPTIONS: { value: TaskItemPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

interface TaskItemItemProps {
  taskItem: TaskItem;
  entityId: string;
  entityType: TaskItemEntityType;
  page?: number;
  limit?: number;
  sortBy?: TaskItemSortBy;
  sortOrder?: TaskItemSortOrder;
  filters?: TaskItemFilters;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
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
  isExpanded = false,
  onToggleExpanded,
  onStatusOrPriorityChange,
}: TaskItemItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(taskItem.title);
  const [editedDescription, setEditedDescription] = useState(taskItem.description || '');
  const [editedStatus, setEditedStatus] = useState<TaskItemStatus>(taskItem.status);
  const [editedPriority, setEditedPriority] = useState<TaskItemPriority>(taskItem.priority);
  const [editedAssigneeId, setEditedAssigneeId] = useState<string | null>(
    taskItem.assignee?.id || null,
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { optimisticUpdate, optimisticDelete } = useOptimisticTaskItems(
    entityId,
    entityType,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  );
  const { members } = useOrganizationMembers();
  
  // Filter members to only show owner and admin roles
  // Always include current assignee even if they're not owner/admin (to preserve existing assignments)
  const assignableMembers = useMemo(() => {
    if (!members) return [];
    return filterMembersByOwnerOrAdmin({
      members,
      currentAssigneeId: taskItem.assignee?.id || null,
    });
  }, [members, taskItem.assignee?.id]);

  const handleEditToggle = () => {
    setEditedTitle(taskItem.title);
    setEditedDescription(taskItem.description || '');
    setEditedStatus(taskItem.status);
    setEditedPriority(taskItem.priority);
    setEditedAssigneeId(taskItem.assignee?.id || null);
    setIsEditDialogOpen(true);
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditedTitle(taskItem.title);
    setEditedDescription(taskItem.description || '');
    setEditedStatus(taskItem.status);
    setEditedPriority(taskItem.priority);
    setEditedAssigneeId(taskItem.assignee?.id || null);
  };

  const handleSaveEdit = async () => {
    const hasChanges =
      editedTitle !== taskItem.title ||
      editedDescription !== (taskItem.description || '') ||
      editedStatus !== taskItem.status ||
      editedPriority !== taskItem.priority ||
      editedAssigneeId !== (taskItem.assignee?.id || null);

    if (!hasChanges) {
      toast.info('No changes detected.');
      setIsEditDialogOpen(false);
      return;
    }

    if (!editedTitle.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsUpdating(true);

    try {
      await optimisticUpdate(taskItem.id, {
        title: editedTitle.trim(),
        description: editedDescription.trim() || undefined,
        status: editedStatus,
        priority: editedPriority,
        assigneeId: editedAssigneeId,
      });

      toast.success('Task updated successfully.');
      setIsEditDialogOpen(false);
      onStatusOrPriorityChange?.();
    } catch (error) {
      toast.error('Failed to save task changes.');
      console.error('Save changes error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTaskItem = async () => {
    setIsDeleting(true);
    try {
      await optimisticDelete(taskItem.id);
      toast.success('Task deleted successfully.');
      setIsDeleteOpen(false);
      // Refresh stats to update the header counts
      onStatusOrPriorityChange?.();
    } catch (error) {
      toast.error('Failed to delete task.');
      console.error('Delete task error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskItemStatus) => {
    if (newStatus === taskItem.status) return;

    try {
      await optimisticUpdate(taskItem.id, { status: newStatus });
      toast.success('Status updated');
      // Refresh stats to update the header counts
      onStatusOrPriorityChange?.();
    } catch (error) {
      toast.error('Failed to update status');
      console.error('Status update error:', error);
    }
  };

  const handlePriorityChange = async (newPriority: TaskItemPriority) => {
    if (newPriority === taskItem.priority) return;

    try {
      await optimisticUpdate(taskItem.id, { priority: newPriority });
      toast.success('Priority updated');
      // Refresh stats to update the header counts
      onStatusOrPriorityChange?.();
    } catch (error) {
      toast.error('Failed to update priority');
      console.error('Priority update error:', error);
    }
  };

  const getStatusIcon = (status: TaskItemStatus) => {
    switch (status) {
      case 'todo':
        return Circle; // Todo circle (same as Evidence page)
      case 'done':
        return CheckCircle2; // Clear completed check
      case 'in_progress':
        return Clock3; // Progress / ongoing (non-spinning)
      case 'in_review':
        return Eye; // Review / needs attention
      case 'canceled':
        return XCircle; // Canceled / stopped
      default:
        return Circle; // Default to circle
    }
  };

  const getStatusColor = (status: TaskItemStatus) => {
    switch (status) {
      case 'done':
        return 'bg-transparent text-primary';
      case 'in_progress':
        return 'bg-transparent text-blue-600 dark:text-blue-400 ';
      case 'in_review':
        return 'bg-transparent text-purple-600 dark:text-purple-400';
      case 'canceled':
        return 'bg-transparent text-slate-600 dark:text-slate-400';
      default:
        return 'bg-transparent text-slate-600 dark:text-slate-400';
    }
  };

  const getPriorityIcon = (priority: TaskItemPriority) => {
    switch (priority) {
      case 'urgent':
        return AlertTriangle; // Strong warning icon - urgency
      case 'high':
        return TrendingUp; // Clear "higher" indicator
      case 'medium':
        return Gauge; // Neutral / normal
      case 'low':
        return ArrowDownRight; // Lower / de-prioritized
      default:
        return Gauge;
    }
  };

  const getPriorityColor = (priority: TaskItemPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-transparent text-red-600 dark:text-red-400 ';
      case 'high':
        return 'bg-transparent text-pink-600 dark:text-pink-400';
      case 'medium':
        return 'bg-transparent text-amber-600 dark:text-amber-400';
      case 'low':
        return 'bg-transparent text-slate-600 dark:text-slate-400 ';
      default:
        return 'bg-transparent text-slate-600 dark:text-slate-400 ';
    }
  };

  return (
    <>
      <div 
        className="flex items-center gap-2 p-4 rounded-lg border border-border bg-card hover:shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-shadow duration-150 group cursor-pointer"
        onClick={(e) => {
          // Don't open detail dialog if clicking on interactive elements
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('[role="menuitem"]')) {
            return;
          }
          onToggleExpanded?.();
        }}
      >
        <div className="flex-1 flex items-center gap-3 text-sm w-full">
          <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Priority Icon - Fixed width */}
                <div className="w-8 shrink-0 flex items-center justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className={`group/priority h-6 px-1.5 rounded-md cursor-pointer select-none transition-colors duration-150 focus:outline-none hover:bg-accent/50 active:bg-accent flex items-center justify-center gap-0.5 ${getPriorityColor(taskItem.priority)}`}
                        aria-label={`Priority: ${taskItem.priority}. Click to change.`}
                        title={`Priority: ${taskItem.priority}. Click to change.`}
                      >
                        {(() => {
                          const PriorityIcon = getPriorityIcon(taskItem.priority);
                          return <PriorityIcon className="h-4 w-4 stroke-[2]" />;
                        })()}
                        <ChevronDown className="h-2.5 w-2.5 opacity-0 group-hover/priority:opacity-60 transition-opacity duration-150 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      {PRIORITY_OPTIONS.map((option) => {
                        const isSelected = taskItem.priority === option.value;
                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onSelect={() => handlePriorityChange(option.value)}
                            className={`cursor-pointer ${isSelected ? 'bg-accent font-medium' : ''}`}
                          >
                            <div className="flex items-center gap-2 w-full">
                              {(() => {
                                const PriorityIcon = getPriorityIcon(option.value);
                                return (
                                  <PriorityIcon
                                    className={`h-3.5 w-3.5 stroke-[2] ${
                                      option.value === 'urgent'
                                        ? 'text-red-600 dark:text-red-400'
                                        : option.value === 'high'
                                          ? 'text-pink-600 dark:text-pink-400'
                                          : option.value === 'medium'
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : option.value === 'low'
                                              ? 'text-slate-600 dark:text-slate-400'
                                              : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                  />
                                );
                              })()}
                              <span>{option.label}</span>
                              {isSelected && (
                                <span className="ml-auto text-xs">✓</span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Task ID Tag - Fixed width */}
                <div className="w-14 shrink-0">
                  <span className="text-[10px] font-mono font-medium text-muted-foreground/70 uppercase tracking-wider">
                    {getTaskIdShort(taskItem.id)}
                  </span>
                </div>

                {/* Status Icon - Fixed width */}
                <div className="w-8 shrink-0 flex items-center justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className={`group/status h-6 px-1.5 rounded-md cursor-pointer select-none transition-colors duration-150 focus:outline-none hover:bg-accent/50 active:bg-accent flex items-center justify-center gap-0.5 ${getStatusColor(taskItem.status)}`}
                        aria-label={`Status: ${taskItem.status.replace('_', ' ')}. Click to change.`}
                        title={`Status: ${taskItem.status.replace('_', ' ')}. Click to change.`}
                      >
                        {(() => {
                          const StatusIcon = getStatusIcon(taskItem.status);
                          return <StatusIcon className="h-4 w-4 stroke-[2]" />;
                        })()}
                        <ChevronDown className="h-2.5 w-2.5 opacity-0 group-hover/status:opacity-60 transition-opacity duration-150 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      {STATUS_OPTIONS.map((option) => {
                        const isSelected = taskItem.status === option.value;
                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onSelect={() => handleStatusChange(option.value)}
                            className={`cursor-pointer ${isSelected ? 'bg-accent font-medium' : ''}`}
                          >
                            <div className="flex items-center gap-2 w-full">
                              {(() => {
                                const StatusIcon = getStatusIcon(option.value);
                                return (
                                  <StatusIcon
                                    className={`h-3.5 w-3.5 stroke-[2] ${
                                      option.value === 'done'
                                        ? 'text-primary'
                                        : option.value === 'in_progress'
                                          ? 'text-blue-600 dark:text-blue-400'
                                          : option.value === 'in_review'
                                            ? 'text-purple-600 dark:text-purple-400'
                                            : option.value === 'canceled'
                                              ? 'text-slate-600 dark:text-slate-400'
                                              : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                  />
                                );
                              })()}
                              <span>{option.label}</span>
                              {isSelected && (
                                <span className="ml-auto text-xs">✓</span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Title - Flexible but with max width */}
                <h4 className="text-sm font-medium flex-1 min-w-0 max-w-[300px] truncate cursor-pointer">{taskItem.title}</h4>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Assignee Dropdown - Fixed width */}
                <div onClick={(e) => e.stopPropagation()} className="shrink-0 w-[180px]" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="[&_button]:h-6 [&_button]:text-sm [&_button]:px-2 [&_button]:w-full [&_button]:border-0 [&_button]:shadow-none [&_button]:bg-transparent hover:[&_button]:bg-accent [&_button]:leading-6 [&_button]:gap-1.5 [&_button>div]:min-w-0 [&_button>div>span]:truncate [&_button>div>span]:max-w-[140px]">
                    <SelectAssignee
                      assigneeId={taskItem.assignee?.id || null}
                      assignees={assignableMembers}
                      onAssigneeChange={async (newAssigneeId) => {
                        try {
                          await optimisticUpdate(taskItem.id, { assigneeId: newAssigneeId });
                          toast.success('Assignee updated');
                          onStatusOrPriorityChange?.();
                        } catch (error) {
                          toast.error('Failed to update assignee');
                          console.error('Assignee update error:', error);
                        }
                      }}
                      withTitle={false}
                      disabled={isUpdating}
                    />
                  </div>
                </div>

                {/* Short Date - Fixed width */}
                <div className="w-16 shrink-0 text-right">
                  <span className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer">{formatShortDate(taskItem.createdAt)}</span>
                </div>

                {/* Options Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      aria-label="Task options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault();
                        handleEditToggle();
                      }}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onSelect={() => setIsDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
        </div>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                disabled={isUpdating}
                placeholder="Task title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                disabled={isUpdating}
                rows={4}
                placeholder="Task description (optional)"
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-sm font-medium">
                  Status
                </Label>
                <Select
                  value={editedStatus}
                  onValueChange={(value) => setEditedStatus(value as TaskItemStatus)}
                  disabled={isUpdating}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-priority" className="text-sm font-medium">
                  Priority
                </Label>
                <Select
                  value={editedPriority}
                  onValueChange={(value) => setEditedPriority(value as TaskItemPriority)}
                  disabled={isUpdating}
                >
                  <SelectTrigger id="edit-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {assignableMembers && assignableMembers.length > 0 && (
              <div className="space-y-2">
                <SelectAssignee
                  assigneeId={editedAssigneeId}
                  assignees={assignableMembers}
                  onAssigneeChange={setEditedAssigneeId}
                  disabled={isUpdating}
                  withTitle={true}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating || !editedTitle.trim()}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Task Details (no modal) */}
      {isExpanded && (
        <div className="mt-2 rounded-lg border border-border bg-muted/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium truncate">{taskItem.title}</h4>
                <span className="text-[10px] font-mono font-medium text-muted-foreground/70 uppercase tracking-wider">
                  {getTaskIdShort(taskItem.id)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Created {formatShortDate(taskItem.createdAt)}</span>
                {taskItem.assignee && (
                  <span className="flex items-center gap-1.5">
                    <Avatar className="h-4 w-4 border border-border">
                      <AvatarImage
                        src={taskItem.assignee.user.image || undefined}
                        alt={taskItem.assignee.user.name}
                      />
                      <AvatarFallback className="text-[8px] bg-muted">
                        {taskItem.assignee.user.name?.charAt(0).toUpperCase() ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span>Assigned to {taskItem.assignee.user.name}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onToggleExpanded}>
                Close
              </Button>
              <Button size="sm" onClick={handleEditToggle}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {taskItem.description ? (
              <div>
                <div className="text-xs font-medium mb-1">Description</div>
                <TaskItemDescriptionView
                  description={taskItem.description}
                  className="text-sm"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No description provided.
              </p>
            )}

            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground pt-3 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Created by {taskItem.createdBy.user.name}</span>
                {taskItem.updatedBy && taskItem.updatedBy.id !== taskItem.createdBy.id && (
                  <span>• Updated by {taskItem.updatedBy.user.name}</span>
                )}
              </div>
              {taskItem.assignee && (
                <div>
                  <span>
                    Assigned by{' '}
                    {taskItem.updatedBy && taskItem.updatedBy.id !== taskItem.createdBy.id
                      ? taskItem.updatedBy.user.name
                      : taskItem.createdBy.user.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTaskItem} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

