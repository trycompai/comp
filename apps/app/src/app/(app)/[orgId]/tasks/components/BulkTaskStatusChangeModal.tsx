'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Label } from '@comp/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Member, TaskStatus, User } from '@db';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTasks } from '../hooks/useTasks';
import { TaskStatusIndicator } from './TaskStatusIndicator';

interface BulkTaskStatusChangeModalProps {
  open: boolean;
  selectedTaskIds: string[];
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  evidenceApprovalEnabled?: boolean;
  members?: (Member & { user: User })[];
}

export function BulkTaskStatusChangeModal({
  open,
  onOpenChange,
  selectedTaskIds,
  onSuccess,
  evidenceApprovalEnabled = false,
  members = [],
}: BulkTaskStatusChangeModalProps) {
  const { bulkUpdateStatus, bulkSubmitForReview } = useTasks();

  // Filter out in_review from status options - it's only set through approval flow
  const statusOptions = useMemo(
    () => (Object.values(TaskStatus) as TaskStatus[]).filter((s) => s !== TaskStatus.in_review),
    [],
  );
  const defaultStatus = statusOptions[0];

  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approverId, setApproverId] = useState<string | null>(null);
  const selectedCount = selectedTaskIds.length;
  const isSingular = selectedCount === 1;

  // Whether we need approval for this status change
  const needsApproval = evidenceApprovalEnabled && status === TaskStatus.done;

  useEffect(() => {
    if (open) {
      setStatus(defaultStatus);
      setApproverId(null);
    }
  }, [defaultStatus, open]);

  const handleMove = async () => {
    if (selectedTaskIds.length === 0) {
      return;
    }

    // If approval is needed, validate approver is selected
    if (needsApproval && !approverId) {
      toast.error('Please select an approver');
      return;
    }

    try {
      setIsSubmitting(true);

      if (needsApproval) {
        // Submit all tasks for review in a single bulk request
        const { submittedCount } = await bulkSubmitForReview(selectedTaskIds, approverId!);
        toast.success(`${submittedCount} task${submittedCount === 1 ? '' : 's'} submitted for review`);
      } else {
        // Normal bulk status change using hook
        const reviewDate = status === TaskStatus.done ? new Date().toISOString() : undefined;
        const { updatedCount } = await bulkUpdateStatus(selectedTaskIds, status, reviewDate);
        toast.success(`Updated ${updatedCount} task${updatedCount === 1 ? '' : 's'}`);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to bulk update task status', error);
      const message = error instanceof Error ? error.message : 'Failed to update tasks';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Status Update</DialogTitle>
          <DialogDescription>
            {`${selectedCount} item${isSingular ? '' : 's'} ${
              isSingular ? 'is' : 'are'
            } selected. Are you sure you want to change the status?`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 flex flex-row items-center gap-4">
            <Label htmlFor="task-status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
              <SelectTrigger id="task-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    <div className="flex items-center gap-2">
                      <TaskStatusIndicator status={option} />
                      <span className="capitalize">{option.replace('_', ' ')}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsApproval && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Evidence approval is enabled. Select an approver to review these tasks before they can be marked as done.
              </p>
              <SelectAssignee
                assigneeId={approverId}
                assignees={members}
                onAssigneeChange={setApproverId}
                withTitle={false}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isSubmitting || (needsApproval && !approverId)}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : needsApproval ? (
              'Submit for Review'
            ) : (
              'Change Status'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
