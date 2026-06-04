'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@trycompai/ui/alert-dialog';
import { Button } from '@trycompai/ui/button';
import { Checkbox, Label } from '@trycompai/design-system';
import { useEffect, useState } from 'react';

interface RemoveMemberAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  onRemove: (options: { skipOffboarding: boolean }) => void;
  isRemoving: boolean;
}

export function RemoveMemberAlert({
  open,
  onOpenChange,
  memberName,
  onRemove,
  isRemoving,
}: RemoveMemberAlertProps) {
  const [skipOffboarding, setSkipOffboarding] = useState(false);

  useEffect(() => {
    if (!open) {
      setSkipOffboarding(false);
    }
  }, [open]);

  const handleRemoveClick = () => {
    onRemove({ skipOffboarding });
  };

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
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="skip-offboarding"
            checked={skipOffboarding}
            onCheckedChange={(checked) => setSkipOffboarding(checked === true)}
          />
          <Label htmlFor="skip-offboarding">Skip offboarding</Label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{'Cancel'}</AlertDialogCancel>
          <Button variant="destructive" onClick={handleRemoveClick} disabled={isRemoving}>
            {'Remove'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
