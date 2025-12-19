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
import { Textarea } from '@comp/ui/textarea';
import type {
  TaskItemEntityType,
  TaskItemFilters,
  TaskItemPriority,
  TaskItemSortBy,
  TaskItemSortOrder,
  TaskItemStatus,
} from '@/hooks/use-task-items';
import { Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { SelectAssignee } from '@/components/SelectAssignee';
import { filterMembersByOwnerOrAdmin } from '@/utils/filter-members-by-role';

interface TaskItemFormProps {
  entityId: string;
  entityType: TaskItemEntityType;
  page?: number;
  limit?: number;
  sortBy?: TaskItemSortBy;
  sortOrder?: TaskItemSortOrder;
  filters?: TaskItemFilters;
  onSuccess?: () => void;
  onCancel?: () => void;
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

export function TaskItemForm({
  entityId,
  entityType,
  page = 1,
  limit = 5,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  filters = {},
  onSuccess,
  onCancel,
}: TaskItemFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskItemStatus>('todo');
  const [priority, setPriority] = useState<TaskItemPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { optimisticCreate } = useOptimisticTaskItems(
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
  const assignableMembers = useMemo(() => {
    if (!members) return [];
    return filterMembersByOwnerOrAdmin({ members });
  }, [members]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await optimisticCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        entityId,
        entityType,
        assigneeId: assigneeId || undefined,
      });

      toast.success('Task created!');

      // Reset form
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setAssigneeId(null);

      // Call success callback
      onSuccess?.();
    } catch (error) {
      console.error('Error creating task item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
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
        <Textarea
          id="task-description"
          placeholder="Enter task description (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          className="bg-background resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="task-status" className="text-sm font-medium">
            Status
          </Label>
          <Select value={status} onValueChange={(value) => setStatus(value as TaskItemStatus)}>
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
            disabled={isSubmitting}
            className="h-8 px-3"
          >
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim()}
          className="h-8 px-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Task'
          )}
        </Button>
      </div>
    </div>
  );
}

