'use client';

import { useApi } from '@/hooks/use-api';
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
  const api = useApi();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: '',
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const response = await api.delete(`/v1/policies/${policy.id}`);
    setIsSubmitting(false);

    if (response.error) {
      toast.error('Failed to delete policy.');
      return;
    }

    onClose();
    toast.info('Policy deleted! Redirecting to policies list...');
    router.replace(`/${policy.organizationId}/policies`);
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
