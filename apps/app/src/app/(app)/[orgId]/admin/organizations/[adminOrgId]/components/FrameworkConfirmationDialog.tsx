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
import type { PendingAction } from './FrameworksTab';

function getPendingActionFrameworkName(pendingAction: PendingAction) {
  if (pendingAction.type === 'add') {
    return pendingAction.framework.name;
  }
  const details = pendingAction.framework.framework ?? pendingAction.framework.customFramework;
  return details?.name ?? 'Unknown framework';
}

export function FrameworkConfirmationDialog({
  pendingAction,
  submitting,
  onOpenChange,
  onConfirm,
}: {
  pendingAction: PendingAction | null;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const frameworkName = pendingAction ? getPendingActionFrameworkName(pendingAction) : '';

  return (
    <AlertDialog open={pendingAction !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {pendingAction?.type === 'add' ? `Add ${frameworkName}?` : `Remove ${frameworkName}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pendingAction?.type === 'add'
              ? `This will add ${frameworkName} to this organization and create its related structure.`
              : `This will remove ${frameworkName} from this organization only. The global framework will not be deleted.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={pendingAction?.type === 'delete' ? 'destructive' : 'default'}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={submitting}
          >
            {submitting
              ? 'Saving...'
              : pendingAction?.type === 'delete'
                ? 'Yes, remove framework'
                : 'Yes, add framework'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
