'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import type {
  TaskItem,
  TaskItemEntityType,
  TaskItemFilters,
  TaskItemPriority,
  TaskItemSortBy,
  TaskItemSortOrder,
  TaskItemStatus,
} from '@/hooks/use-task-items';
import { useOptimisticTaskItems } from '@/hooks/use-task-items';
import { filterMembersByOwnerOrAdmin } from '@/utils/filter-members-by-role';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Grid,
  HStack,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Stack,
  TableCell,
  TableRow,
  Text,
  Textarea,
} from '@trycompai/design-system';
import {
  ArrowDownRight,
  ChartLine,
  CheckmarkFilled,
  ChevronDown,
  DotMark,
  Edit,
  Misuse,
  QOperationGauge,
  Time,
  TrashCan,
  View,
  Warning,
} from '@trycompai/design-system/icons';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TaskItemDescriptionView } from './TaskItemDescriptionView';
import { VerifyRiskAssessmentTaskItemSkeletonRow } from './verify-risk-assessment/VerifyRiskAssessmentTaskItemSkeletonRow';

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
  if (taskItem.title === 'Verify risk assessment' && taskItem.status === 'in_progress') {
    return <VerifyRiskAssessmentTaskItemSkeletonRow />;
  }

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
        return DotMark; // Todo circle (same as Evidence page)
      case 'done':
        return CheckmarkFilled; // Clear completed check
      case 'in_progress':
        return Time; // Progress / ongoing (non-spinning)
      case 'in_review':
        return View; // Review / needs attention
      case 'canceled':
        return Misuse; // Canceled / stopped
      default:
        return DotMark; // Default to circle
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
        return Warning; // Strong warning icon - urgency
      case 'high':
        return ChartLine; // Clear "higher" indicator
      case 'medium':
        return QOperationGauge; // Neutral / normal
      case 'low':
        return ArrowDownRight; // Lower / de-prioritized
      default:
        return QOperationGauge;
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
      <TableRow
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('[role="menuitem"]')) {
            return;
          }
          onToggleExpanded?.();
        }}
      >
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger
              variant="menubar"
              onClick={(e) => e.stopPropagation()}
              className={getPriorityColor(taskItem.priority)}
              aria-label={`Priority: ${taskItem.priority}. Click to change.`}
              title={`Priority: ${taskItem.priority}. Click to change.`}
            >
              {(() => {
                const PriorityIcon = getPriorityIcon(taskItem.priority);
                return <PriorityIcon className="h-4 w-4 stroke-2" />;
              })()}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <div className="w-40">
                {PRIORITY_OPTIONS.map((option) => {
                  const isSelected = taskItem.priority === option.value;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => handlePriorityChange(option.value)}
                    >
                      <HStack gap="xs" align="center">
                        {(() => {
                          const PriorityIcon = getPriorityIcon(option.value);
                          return (
                            <PriorityIcon
                              className={`h-3.5 w-3.5 stroke-2 ${
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
                        <Text size="sm">{option.label}</Text>
                        {isSelected && (
                          <Text size="xs" variant="muted" as="span">
                            ✓
                          </Text>
                        )}
                      </HStack>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
        <TableCell>
          <Stack gap="xs">
            <Text weight="medium">{taskItem.title}</Text>
            <Text size="xs" variant="muted">
              {getTaskIdShort(taskItem.id)}
            </Text>
          </Stack>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger
              variant="menubar"
              onClick={(e) => e.stopPropagation()}
              className={getStatusColor(taskItem.status)}
              aria-label={`Status: ${taskItem.status.replace('_', ' ')}. Click to change.`}
              title={`Status: ${taskItem.status.replace('_', ' ')}. Click to change.`}
            >
              {(() => {
                const StatusIcon = getStatusIcon(taskItem.status);
                return <StatusIcon className="h-4 w-4 stroke-2" />;
              })()}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <div className="w-40">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = taskItem.status === option.value;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => handleStatusChange(option.value)}
                    >
                      <HStack gap="xs" align="center">
                        {(() => {
                          const StatusIcon = getStatusIcon(option.value);
                          return (
                            <StatusIcon
                              className={`h-3.5 w-3.5 stroke-2 ${
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
                        <Text size="sm">{option.label}</Text>
                        {isSelected && (
                          <Text size="xs" variant="muted" as="span">
                            ✓
                          </Text>
                        )}
                      </HStack>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
        <TableCell>
          <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
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
        </TableCell>
        <TableCell>
          <Text size="sm" variant="muted">
            {formatShortDate(taskItem.createdAt)}
          </Text>
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteOpen(true);
            }}
            aria-label="Delete task"
          >
            <TrashCan className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details and settings</DialogDescription>
          </DialogHeader>
          <Stack gap="md">
            <Stack gap="xs">
              <Label htmlFor="edit-title">
                Title{' '}
                <Text as="span" size="sm" variant="destructive">
                  *
                </Text>
              </Label>
              <Input
                id="edit-title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                disabled={isUpdating}
                placeholder="Task title"
              />
            </Stack>

            <Stack gap="xs">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                disabled={isUpdating}
                rows={4}
                placeholder="Task description (optional)"
              />
            </Stack>

            <Grid cols={{ base: '1', sm: '2' }} gap="4">
              <Stack gap="xs">
                <Label htmlFor="edit-status">Status</Label>
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
              </Stack>

              <Stack gap="xs">
                <Label htmlFor="edit-priority">Priority</Label>
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
              </Stack>
            </Grid>

            {assignableMembers && assignableMembers.length > 0 && (
              <Stack gap="xs">
                <SelectAssignee
                  assigneeId={editedAssigneeId}
                  assignees={assignableMembers}
                  onAssigneeChange={setEditedAssigneeId}
                  disabled={isUpdating}
                  withTitle={true}
                />
              </Stack>
            )}
          </Stack>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating || !editedTitle.trim()}>
              {isUpdating && <Spinner />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Task Details (no modal) */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="rounded-lg border border-border bg-muted/10 p-4">
              <HStack align="start" justify="between" gap="sm">
                <Stack gap="xs" style={{ minWidth: 0 }}>
                  <HStack gap="xs" align="center">
                    <Text weight="medium" size="sm">
                      {taskItem.title}
                    </Text>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground/70 uppercase tracking-wider">
                      {getTaskIdShort(taskItem.id)}
                    </span>
                  </HStack>
                  <HStack gap="sm" align="center" wrap="wrap">
                    <Text size="xs" variant="muted">
                      Created {formatShortDate(taskItem.createdAt)}
                    </Text>
                    {taskItem.assignee && (
                      <HStack gap="xs" align="center">
                        <Avatar size="xs">
                          <AvatarImage
                            src={taskItem.assignee.user.image || undefined}
                            alt={taskItem.assignee.user.name}
                          />
                          <AvatarFallback>
                            {taskItem.assignee.user.name?.charAt(0).toUpperCase() ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <Text size="xs" variant="muted">
                          Assigned to {taskItem.assignee.user.name}
                        </Text>
                      </HStack>
                    )}
                  </HStack>
                </Stack>
                <HStack gap="xs" align="center">
                  <Button size="sm" variant="outline" onClick={onToggleExpanded}>
                    Close
                  </Button>
                  <Button size="sm" onClick={handleEditToggle}>
                    <Edit className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </HStack>
              </HStack>

              <Stack gap="sm" style={{ marginTop: '16px' }}>
                {taskItem.description ? (
                  <div>
                    <Text size="xs" weight="medium">
                      Description
                    </Text>
                    <TaskItemDescriptionView
                      description={taskItem.description}
                      className="text-sm"
                    />
                  </div>
                ) : (
                  <Text size="sm" variant="muted">
                    No description provided.
                  </Text>
                )}

                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground pt-3 border-t border-border">
                  <HStack gap="xs" align="center" wrap="wrap">
                    <Text size="xs" variant="muted">
                      Created by {taskItem.createdBy.user.name}
                    </Text>
                    {taskItem.updatedBy && taskItem.updatedBy.id !== taskItem.createdBy.id && (
                      <Text size="xs" variant="muted">
                        • Updated by {taskItem.updatedBy.user.name}
                      </Text>
                    )}
                  </HStack>
                  {taskItem.assignee && (
                    <div>
                      <Text size="xs" variant="muted">
                        Assigned by{' '}
                        {taskItem.updatedBy && taskItem.updatedBy.id !== taskItem.createdBy.id
                          ? taskItem.updatedBy.user.name
                          : taskItem.createdBy.user.name}
                      </Text>
                    </div>
                  )}
                </div>
              </Stack>
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && setIsDeleteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
