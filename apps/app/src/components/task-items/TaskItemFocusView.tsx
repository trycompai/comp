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
import { useMemo, useRef, useState } from 'react';
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
import { RecentAuditLogs } from '@/components/RecentAuditLogs';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { Comments } from '../comments/Comments';
import { CommentEntityType } from '@db';
import { usePermissions } from '@/hooks/use-permissions';
import { SelectAssignee } from '@/components/SelectAssignee';
import { StatusIndicator, type StatusType } from '@/components/status-indicator';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from './task-item-utils';
import {
  Button,
  Grid,
  HStack,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { Loader2 } from 'lucide-react';

/** Extract plain text from a description that may be TipTap JSON or plain text */
function getDescriptionText(description: string | null): string {
  if (!description) return '';
  // Try to parse as TipTap JSON
  if (description.startsWith('{') || description.startsWith('[')) {
    try {
      const parsed = JSON.parse(description);
      // Recursively extract text from TipTap JSON content
      const extractText = (node: Record<string, unknown>): string => {
        if (typeof node.text === 'string') return node.text;
        if (Array.isArray(node.content)) {
          return (node.content as Record<string, unknown>[]).map(extractText).join(' ');
        }
        return '';
      };
      return extractText(parsed).trim();
    } catch {
      return description;
    }
  }
  return description;
}

const STATUS_TO_INDICATOR: Record<TaskItemStatus, StatusType> = {
  todo: 'todo',
  in_progress: 'in_progress',
  in_review: 'in_review',
  done: 'done',
  canceled: 'archived',
};

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
  const canUpdate = hasPermission('task', 'update');
  const canDelete = hasPermission('task', 'delete');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const { logs: activityLogs, mutate: refreshActivity } = useAuditLogs({
    entityType: 'task',
    entityId: taskItem.id,
  });

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

  const handleUpdate = async (updates: { title?: string; description?: string }) => {
    setIsUpdating(true);
    try {
      await optimisticUpdate(taskItem.id, updates);
      refreshActivity();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditDescription = () => {
    setDescriptionValue(getDescriptionText(taskItem.description));
    setIsEditingDescription(true);
  };

  const saveDescription = async () => {
    if (descriptionValue === (taskItem.description || '')) {
      setIsEditingDescription(false);
      return;
    }
    try {
      await handleUpdate({ description: descriptionValue.trim() });
      toast.success('Description updated');
      setIsEditingDescription(false);
    } catch {
      toast.error('Failed to update description');
    }
  };

  const handleStatusChange = async (value: string) => {
    const newStatus = value as TaskItemStatus;
    if (newStatus === taskItem.status) return;
    try {
      await optimisticUpdate(taskItem.id, { status: newStatus });
      toast.success('Status updated');
      onStatusOrPriorityChange?.();
      refreshActivity();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (value: string) => {
    const newPriority = value as TaskItemPriority;
    if (newPriority === taskItem.priority) return;
    try {
      await optimisticUpdate(taskItem.id, { priority: newPriority });
      toast.success('Priority updated');
      onStatusOrPriorityChange?.();
      refreshActivity();
    } catch {
      toast.error('Failed to update priority');
    }
  };

  const handleAssigneeChange = async (assigneeId: string | null) => {
    try {
      await optimisticUpdate(taskItem.id, { assigneeId });
      toast.success('Assignee updated');
      onStatusOrPriorityChange?.();
      refreshActivity();
    } catch {
      toast.error('Failed to update assignee');
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${pathname}?taskItemId=${taskItem.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await optimisticDelete(taskItem.id);
      toast.success('Task deleted');
      setIsDeleteOpen(false);
      onStatusOrPriorityChange?.();
      onBack();
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Description — tight to title */}
      <div style={{ marginTop: '-0.25rem' }}>
        {isEditingDescription ? (
          <textarea
            ref={descriptionRef}
            value={descriptionValue}
            onChange={(e) => {
              setDescriptionValue(e.target.value);
              // Auto-resize
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
            onFocus={(e) => {
              // Set initial height on focus
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
            onBlur={saveDescription}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setIsEditingDescription(false); }
            }}
            className="w-full text-sm text-muted-foreground bg-transparent border-b border-primary outline-none resize-none overflow-hidden"
            rows={1}
            autoFocus
            placeholder="Add a description..."
          />
        ) : (
          <Text
            size="sm"
            variant="muted"
            as="p"
            onClick={canUpdate ? handleEditDescription : undefined}
            style={canUpdate ? { cursor: 'pointer' } : undefined}
          >
            {getDescriptionText(taskItem.description) || (canUpdate ? 'Add a description...' : '')}
          </Text>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <Stack gap="lg">
          <TabsList variant="underline">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Stack gap="md">
              <Grid cols={{ base: '1', md: '2' }} gap="4">
                <Stack gap="sm">
                  <Label>Assignee</Label>
                  <SelectAssignee
                    assigneeId={taskItem.assignee?.id || null}
                    assignees={assignableMembers}
                    onAssigneeChange={handleAssigneeChange}
                    disabled={!canUpdate || isUpdating}
                    withTitle={false}
                  />
                </Stack>

                <Stack gap="sm">
                  <Label>Status</Label>
                  <Select
                    value={taskItem.status}
                    onValueChange={(v) => handleStatusChange(v as string)}
                    disabled={!canUpdate}
                  >
                    <SelectTrigger>
                      <StatusIndicator status={STATUS_TO_INDICATOR[taskItem.status]} />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <StatusIndicator status={STATUS_TO_INDICATOR[opt.value]} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Stack>

                <Stack gap="sm">
                  <Label>Priority</Label>
                  <Select
                    value={taskItem.priority}
                    onValueChange={(v) => handlePriorityChange(v as string)}
                    disabled={!canUpdate}
                  >
                    <SelectTrigger>
                      {taskItem.priority.charAt(0).toUpperCase() + taskItem.priority.slice(1)}
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Stack>
              </Grid>
            </Stack>
          </TabsContent>

          <TabsContent value="comments">
            <Comments
              entityId={taskItem.id}
              entityType={CommentEntityType.task}
            />
          </TabsContent>

          <TabsContent value="activity">
            <RecentAuditLogs logs={activityLogs} />
          </TabsContent>

          <TabsContent value="settings">
            <Stack gap="lg">
              <HStack justify="between" align="center">
                <Stack gap="none">
                  <Text size="sm" weight="medium">Copy Link</Text>
                  <Text size="xs" variant="muted">
                    Copy a direct link to this task to share with your team
                  </Text>
                </Stack>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  Copy Link
                </Button>
              </HStack>

              {canDelete && (
                <>
                  <div className="border-t" />
                  <HStack justify="between" align="center">
                    <Stack gap="none">
                      <Text size="sm" weight="medium">Delete Task</Text>
                      <Text size="xs" variant="muted">
                        Permanently delete this task. This action cannot be undone
                      </Text>
                    </Stack>
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteOpen(true)}>
                      Delete Task
                    </Button>
                  </HStack>
                </>
              )}
            </Stack>
          </TabsContent>
        </Stack>
      </Tabs>

      {/* Delete dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && setIsDeleteOpen(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>Are you sure? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</>
              ) : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
