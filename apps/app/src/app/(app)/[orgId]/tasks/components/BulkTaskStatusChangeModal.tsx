'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { TaskStatusIndicator } from './TaskStatusIndicator';

interface BulkTaskStatusChangeModalProps {
  open: boolean;
  selectedTaskIds: string[];
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkTaskStatusChangeModal({
  open,
  onOpenChange,
  selectedTaskIds,
  onSuccess,
}: BulkTaskStatusChangeModalProps) {
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const orgIdParam = Array.isArray(params.orgId) ? params.orgId[0] : params.orgId;

  const statusOptions = useMemo(() => Object.values(TaskStatus) as TaskStatus[], []);
  const defaultStatus = statusOptions[0];

  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(defaultStatus);
    }
  }, [defaultStatus, open]);

  const handleMove = async () => {
    if (!orgIdParam || selectedTaskIds.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        taskIds: selectedTaskIds,
        status,
        ...(status === TaskStatus.done ? { reviewDate: new Date().toISOString() } : {}),
      };

      const response = await apiClient.patch<{ updatedCount: number }>(
        '/v1/tasks/bulk',
        payload,
        orgIdParam,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      const updatedCount = response.data?.updatedCount ?? selectedTaskIds.length;
      toast.success(`Updated ${updatedCount} task${updatedCount === 1 ? '' : 's'}`);
      onSuccess?.();
      onOpenChange(false);
      router.refresh();
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
          <DialogTitle>Bulk Update</DialogTitle>
          <DialogDescription>
            {`${selectedTaskIds.length} items are selected. Are you sure you want to move them?`}
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
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}