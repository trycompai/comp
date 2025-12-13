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

interface RemoveDeviceAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  onRemove: () => void;
  isRemoving: boolean;
}

export function RemoveDeviceAlert({
  open,
  onOpenChange,
  memberName,
  onRemove,
  isRemoving,
}: RemoveDeviceAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{'Remove Device'}</AlertDialogTitle>
          <AlertDialogDescription>
            {'Are you sure you want to remove the device for this user '} <strong>{memberName}</strong>?{' '}
            {'This will disconnect the device from the organization.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{'Cancel'}</AlertDialogCancel>
          <AlertDialogAction onClick={onRemove} disabled={isRemoving}>
            {'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
