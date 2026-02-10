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
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTasks } from '../hooks/useTasks';

interface BulkTaskDeleteModalProps {
  open: boolean;
  selectedTaskIds: string[];
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkTaskDeleteModal({
  open,
  onOpenChange,
  selectedTaskIds,
  onSuccess,
}: BulkTaskDeleteModalProps) {
  const { bulkDelete } = useTasks();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedCount = selectedTaskIds.length;
  const isSingular = selectedCount === 1;

  const handleDelete = async () => {
    if (selectedTaskIds.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const { deletedCount } = await bulkDelete(selectedTaskIds);
      toast.success(`Deleted ${deletedCount} task${deletedCount === 1 ? '' : 's'}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to bulk delete tasks', error);
      const message = error instanceof Error ? error.message : 'Failed to delete tasks';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Tasks</DialogTitle>
          <DialogDescription>
            {`Are you sure you want to delete ${selectedCount} task${isSingular ? '' : 's'}? This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
