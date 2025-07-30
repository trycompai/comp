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
import { Form } from '@comp/ui/form';
import { Task } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { deleteTaskAction } from '../actions/delete-task';

const formSchema = z.object({
  comment: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TaskDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

export function TaskDeleteDialog({ isOpen, onClose, task }: TaskDeleteDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: '',
    },
  });

  const deleteTask = useAction(deleteTaskAction, {
    onSuccess: () => {
      toast.info('Task deleted! Redirecting to tasks list...');
      onClose();
      router.push(`/${task.organizationId}/tasks`);
    },
    onError: () => {
      toast.error('Failed to delete task.');
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    deleteTask.execute({
      id: task.id,
      entityId: task.id,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this task? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
