'use client';

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
import { TaskStatus } from '@db';
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
  mutateTasks?: () => Promise<unknown>;
}

export function BulkTaskStatusChangeModal({
  open,
  onOpenChange,
  selectedTaskIds,
  onSuccess,
}: BulkTaskStatusChangeModalProps) {
  const { bulkUpdateStatus } = useTasks();
  const statusOptions = useMemo(() => Object.values(TaskStatus) as TaskStatus[], []);
  const defaultStatus = statusOptions[0];

  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedCount = selectedTaskIds.length;
  const isSingular = selectedCount === 1;

  useEffect(() => {
    if (open) {
      setStatus(defaultStatus);
    }
  }, [defaultStatus, open]);

  const handleMove = async () => {
    if (selectedTaskIds.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const reviewDate = status === TaskStatus.done ? new Date().toISOString() : undefined;
      const { updatedCount } = await bulkUpdateStatus(selectedTaskIds, status, reviewDate);
      toast.success(`Updated ${updatedCount} task${updatedCount === 1 ? '' : 's'}`);
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

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
