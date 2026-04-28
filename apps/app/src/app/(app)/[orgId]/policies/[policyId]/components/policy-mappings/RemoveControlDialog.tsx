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

interface RemoveControlDialogProps {
  control: { id: string; name: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveControlDialog({
  control,
  onCancel,
  onConfirm,
}: RemoveControlDialogProps) {
  return (
    <AlertDialog
      open={control !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove control mapping</AlertDialogTitle>
          <AlertDialogDescription>
            {control ? (
              <>
                Remove <strong>{control.name}</strong> from this policy? You can
                map it again later.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
