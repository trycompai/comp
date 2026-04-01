'use client';

import { Button } from '@trycompai/design-system';
import { TrashCan } from '@trycompai/design-system/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { Form } from '@trycompai/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import { useFrameworks } from '@/hooks/use-frameworks';

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
  const { deleteFramework } = useFrameworks();
  const { hasPermission } = usePermissions();
  const canDeleteFramework = hasPermission('framework', 'delete');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: '',
    },
  });

  const handleSubmit = async (_values: FormValues) => {
    setIsSubmitting(true);
    try {
      await deleteFramework(frameworkInstance.id);
      toast.info('Framework deleted! Redirecting to overview...');
      onClose();
      router.push(`/${frameworkInstance.organizationId}/overview`);
    } catch {
      toast.error('Failed to delete framework.');
      setIsSubmitting(false);
    }
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
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting || !canDeleteFramework}
                loading={isSubmitting}
                iconLeft={!isSubmitting ? <TrashCan size={14} /> : undefined}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
