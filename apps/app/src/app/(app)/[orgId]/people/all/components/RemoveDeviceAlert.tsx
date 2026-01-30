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
import { ReactNode } from 'react';

interface RemoveDeviceAlertProps {
  open: boolean;
  title: string;
  description: ReactNode;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
  isRemoving: boolean;
}

export function RemoveDeviceAlert({
  open,
  title,
  description,
  onOpenChange,
  onRemove,
  isRemoving,
}: RemoveDeviceAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
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
