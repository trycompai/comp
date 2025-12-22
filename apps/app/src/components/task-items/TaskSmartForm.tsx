'use client';

import { useOptimisticTaskItems } from '@/hooks/use-task-items';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@comp/ui/select';
import type {
  TaskItemEntityType,
  TaskItemFilters,
  TaskItemPriority,
  TaskItemSortBy,
  TaskItemSortOrder,
  TaskItemStatus,
} from '@/hooks/use-task-items';
import { Loader2 } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { SelectAssignee } from '@/components/SelectAssignee';
import { filterMembersByOwnerOrAdmin } from '@/utils/filter-members-by-role';
import { TaskRichDescriptionField } from './TaskRichDescriptionField';
import { useTaskItemAttachmentUpload } from './hooks/use-task-item-attachment-upload';
import type { JSONContent } from '@tiptap/react';

interface TaskSmartFormProps {
  entityId: string;
  entityType: TaskItemEntityType;
  page?: number;
  limit?: number;
  sortBy?: TaskItemSortBy;
  sortOrder?: TaskItemSortOrder;
  filters?: TaskItemFilters;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  initialValues?: {
    title?: string;
    description?: JSONContent | string;
    status?: TaskItemStatus;
    priority?: TaskItemPriority;
    assigneeId?: string | null;
  };
}

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

export function TaskSmartForm({
  entityId,
  entityType,
  page = 1,
  limit = 5,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  filters = {},
  onSuccess,
  onCancel,
  mode = 'create',
  initialValues,
}: TaskSmartFormProps) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState<JSONContent | null>(
    typeof initialValues?.description === 'object'
      ? initialValues.description
      : null,
  );
  const [status, setStatus] = useState<TaskItemStatus>(
    initialValues?.status || 'todo',
  );
  const [priority, setPriority] = useState<TaskItemPriority>(
    initialValues?.priority || 'medium',
  );
  const [assigneeId, setAssigneeId] = useState<string | null>(
    initialValues?.assigneeId ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { optimisticCreate, optimisticUpdate } = useOptimisticTaskItems(
    entityId,
    entityType,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  );

  const { members } = useOrganizationMembers();
  const { uploadAttachment, isUploading } = useTaskItemAttachmentUpload({
    entityId,
    entityType,
  });

  // Filter members to only show owner and admin roles
  const assignableMembers = useMemo(() => {
    if (!members) return [];
    return filterMembersByOwnerOrAdmin({ members });
  }, [members]);

  // All members for mentions (not filtered)
  const mentionMembers = useMemo(() => {
    if (!members) return [];
    return members.map((member) => ({
      id: member.user.id,
      name: member.user.name || member.user.email || 'Unknown',
      email: member.user.email || '',
      image: member.user.image,
    }));
  }, [members]);

  const handleFileUpload = useCallback(
    async (
      files: File[],
    ): Promise<
      { id: string; name: string; size?: number; downloadUrl?: string; type?: string }[]
    > => {
      if (!files.length) return [];

      const results = [];
      for (const file of files) {
        try {
          const result = await uploadAttachment(file);
          if (result?.id) {
            results.push({
              id: result.id,
              name: result.name,
              size: result.size,
              downloadUrl: result.downloadUrl,
              type: result.type,
            });
            toast.success(`File "${file.name}" attached`);
          }
        } catch (error) {
          console.error('Failed to upload file:', error);
          toast.error(
            `Failed to upload "${file.name}": ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }
      return results;
    },
    [uploadAttachment],
  );

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert description JSON to string for API
      const descriptionText = description
        ? JSON.stringify(description)
        : undefined;

      if (mode === 'create') {
        await optimisticCreate({
          title: title.trim(),
          description: descriptionText,
          status,
          priority,
          entityId,
          entityType,
          assigneeId: assigneeId || undefined,
        });
        toast.success('Task created!');
      } else {
        // TODO: Implement update when we have task item ID
        toast.error('Edit mode not yet implemented');
      }

      // Reset form
      setTitle('');
      setDescription(null);
      setStatus('todo');
      setPriority('medium');
      setAssigneeId(null);

      // Call success callback
      onSuccess?.();
    } catch (error) {
      console.error('Error creating task item:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create task',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === 'Enter' &&
      !isSubmitting &&
      title.trim()
    ) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title" className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="task-title"
          placeholder="Enter task title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          onKeyDown={handleKeyDown}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description" className="text-sm font-medium">
          Description
        </Label>
        <TaskRichDescriptionField
          value={description}
          onChange={setDescription}
          onFileUpload={handleFileUpload}
          members={mentionMembers}
          disabled={isSubmitting}
          placeholder="Enter task description... Mention users with @ or attach files"
          entityId={entityId}
          entityType={entityType}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="task-status" className="text-sm font-medium">
            Status
          </Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as TaskItemStatus)}
          >
            <SelectTrigger id="task-status" className="bg-background">
              <SelectValue />
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
          <Label htmlFor="task-priority" className="text-sm font-medium">
            Priority
          </Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as TaskItemPriority)}
          >
            <SelectTrigger id="task-priority" className="bg-background">
              <SelectValue />
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
            assigneeId={assigneeId}
            assignees={assignableMembers}
            onAssigneeChange={setAssigneeId}
            disabled={isSubmitting}
            withTitle={true}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isUploading}
            className="h-8 px-3"
          >
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || isUploading || !title.trim()}
          className="h-8 px-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              {mode === 'create' ? 'Creating...' : 'Updating...'}
            </>
          ) : (
            mode === 'create' ? 'Create Task' : 'Update Task'
          )}
        </Button>
      </div>
    </div>
  );
}

