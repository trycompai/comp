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
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FrameworkInstanceWithControls } from '../../types';
import { deleteFrameworkAction } from '../actions/delete-framework';

const formSchema = z.object({
  comment: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FrameworkDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  frameworkInstance: FrameworkInstanceWithControls;
}

export function FrameworkDeleteDialog({
  isOpen,
  onClose,
  frameworkInstance,
}: FrameworkDeleteDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: '',
    },
  });

  const deleteFramework = useAction(deleteFrameworkAction, {
    onSuccess: () => {
      toast.info('Framework deleted! Redirecting to frameworks list...');
      onClose();
      router.push(`/${frameworkInstance.organizationId}/frameworks`);
    },
    onError: () => {
      toast.error('Failed to delete framework.');
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    deleteFramework.execute({
      id: frameworkInstance.id,
      entityId: frameworkInstance.id,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Framework</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this framework? This action cannot be undone.
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
