'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@comp/ui/alert-dialog';
import { Button } from '@comp/ui/button';

interface RemoveMemberAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  onRemove: () => void;
  isRemoving: boolean;
}

export function RemoveMemberAlert({
  open,
  onOpenChange,
  memberName,
  onRemove,
  isRemoving,
}: RemoveMemberAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{'Remove Team Member'}</AlertDialogTitle>
          <AlertDialogDescription>
            {'Are you sure you want to remove'} {memberName}?{' '}
            {'They will no longer have access to this organization.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{'Cancel'}</AlertDialogCancel>
          <Button variant="destructive" onClick={onRemove} disabled={isRemoving}>
            {'Remove'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
