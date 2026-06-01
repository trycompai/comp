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
} from '@trycompai/design-system';

interface PolicyAcknowledgmentSource {
  signedBy?: readonly unknown[] | null;
}

interface PolicyAcknowledgmentInvalidationDialogProps {
  acknowledgmentCount: number;
  actionDescription?: string;
  confirmText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function getPolicyAcknowledgmentCount(
  policy: PolicyAcknowledgmentSource | null | undefined,
) {
  return policy?.signedBy?.length ?? 0;
}

export function getPolicyAcknowledgmentTotal(policies: readonly PolicyAcknowledgmentSource[]) {
  return policies.reduce((total, policy) => total + getPolicyAcknowledgmentCount(policy), 0);
}

export function PolicyAcknowledgmentInvalidationDialog({
  acknowledgmentCount,
  actionDescription = 'Publishing this version',
  confirmText = 'Publish and invalidate',
  isLoading = false,
  onConfirm,
  onOpenChange,
  open,
}: PolicyAcknowledgmentInvalidationDialogProps) {
  if (acknowledgmentCount === 0) {
    return null;
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isLoading) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Invalidate policy acknowledgments?</AlertDialogTitle>
          <AlertDialogDescription>
            {actionDescription} will invalidate <strong>{acknowledgmentCount}</strong> existing
            acknowledgment(s). Affected employees will need to re-acknowledge the policy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            loading={isLoading}
            onClick={onConfirm}
            variant="destructive"
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
