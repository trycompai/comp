'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@trycompai/ui';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/app/lib/api-client';

interface DeletePolicyDialogProps {
  policyId: string;
  policyName: string;
  isOpen: boolean;
  onClose: () => void;
  onPolicyDeleted: () => void; // Callback after successful deletion
}

export function DeletePolicyDialog({
  policyId,
  policyName,
  isOpen,
  onClose,
  onPolicyDeleted,
}: DeletePolicyDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await apiClient(`/policy-template/${policyId}`, { method: 'DELETE' });
        toast.success('Policy deleted successfully!');
        onPolicyDeleted();
        onClose();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete policy.';
        toast.error(message);
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="rounded-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the policy template
            <span className="font-semibold">{policyName}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} className="rounded-sm">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-sm"
          >
            {isPending ? 'Deleting...' : 'Delete Policy'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
