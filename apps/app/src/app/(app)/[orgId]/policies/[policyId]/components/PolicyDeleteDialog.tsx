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
import { Policy } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { usePermissions } from '@/hooks/use-permissions';
import { usePolicy } from '../hooks/usePolicy';

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
  const router = useRouter();
  const { orgId } = useParams<{ orgId: string }>();
  const { hasPermission } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { deletePolicy } = usePolicy({
    policyId: policy.id,
    organizationId: orgId,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: '',
    },
  });

  const handleSubmit = async (_values: FormValues) => {
    setIsSubmitting(true);
    try {
      await deletePolicy();
      onClose();
      toast.info('Policy deleted! Redirecting to policies list...');
      router.replace(`/${policy.organizationId}/policies`);
    } catch {
      toast.error('Failed to delete policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Policy</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this policy? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting || !hasPermission('policy', 'delete')} className="gap-2">
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
