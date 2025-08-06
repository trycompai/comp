'use client';

import { deletePolicyAction } from '@/actions/policies/delete-policy';
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
import { Policy } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGT } from 'gt-next';
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

interface PolicyDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  policy: Policy;
}

export function PolicyDeleteDialog({ isOpen, onClose, policy }: PolicyDeleteDialogProps) {
  const t = useGT();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: '',
    },
  });

  const deletePolicy = useAction(deletePolicyAction, {
    onSuccess: () => {
      toast.info(t('Policy deleted! Redirecting to policies list...'));
      onClose();
      router.push(`/${policy.organizationId}/policies/all`);
    },
    onError: () => {
      toast.error(t('Failed to delete policy.'));
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    deletePolicy.execute({
      id: policy.id,
      entityId: policy.id,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Delete Policy')}</DialogTitle>
          <DialogDescription>
            {t('Are you sure you want to delete this policy? This action cannot be undone.')}
          </DialogDescription>
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
