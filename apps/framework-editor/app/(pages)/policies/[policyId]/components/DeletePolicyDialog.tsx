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
} from '@comp/ui/alert-dialog';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { deletePolicyTemplate } from '../../actions'; // Path to server actions

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
        const result = await deletePolicyTemplate(policyId);
        if (result.success) {
          toast.success(result.message || 'Policy deleted successfully!');
          onPolicyDeleted(); // Trigger navigation or refresh
          onClose(); // Close the dialog
        } else {
          toast.error(result.message || 'Failed to delete policy.');
        }
      } catch (error) {
        toast.error('An unexpected error occurred.');
        console.error('Delete error:', error);
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
