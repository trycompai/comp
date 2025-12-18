'use client';

import { triggerPolicyUpdateFromContextAction } from '@/actions/context-hub/trigger-policy-update-from-context';
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
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

interface UpdatePoliciesDialogProps {
  context: { id: string; question: string } | null;
  onClose: () => void;
}

export function UpdatePoliciesDialog({ context, onClose }: UpdatePoliciesDialogProps) {
  const { execute, status } = useAction(triggerPolicyUpdateFromContextAction, {
    onSuccess: () => {
      toast.success('Analyzing affected policies. Updates will run in the background.');
      onClose();
    },
    onError: () => {
      toast.error('Failed to trigger policy updates.');
    },
  });

  const isExecuting = status === 'executing';

  const handleConfirm = () => {
    if (context) {
      execute({ contextId: context.id });
    }
  };

  return (
    <AlertDialog open={context !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Related Policies?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                The context "{context?.question}" has been updated. Would you like to update
                policies that may be affected by this change?
              </p>
              <p className="text-destructive font-medium">
                Warning: This will overwrite existing policy content. Changes cannot be undone
                automatically.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isExecuting}>Skip</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isExecuting}>
            {isExecuting ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </span>
            ) : (
              'Update Policies'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
