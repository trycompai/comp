'use client';

import { deleteControlAction } from '@/app/(app)/[orgId]/controls/[controlId]/actions/delete-control';
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
import { Control } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { T, useGT } from 'gt-next';
import { Trash2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  comment: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ControlDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  control: Control;
}

export function ControlDeleteDialog({ isOpen, onClose, control }: ControlDeleteDialogProps) {
  const t = useGT();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: '',
    },
  });

  const deleteControl = useAction(deleteControlAction, {
    onSuccess: () => {
      toast.info(t('Control deleted! Redirecting to controls list...'));
      onClose();
      router.push(`/${control.organizationId}/controls`);
    },
    onError: () => {
      toast.error(t('Failed to delete control.'));
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    deleteControl.execute({
      id: control.id,
      entityId: control.id,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <T>
            <DialogTitle>Delete Control</DialogTitle>
          </T>
          <T>
            <DialogDescription>
              Are you sure you want to delete this control? This action cannot be undone.
            </DialogDescription>
          </T>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                {t('Cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t('Deleting...')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trash2 className="h-3 w-3" />
                    {t('Delete')}
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
