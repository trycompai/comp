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
  Input,
  Label,
} from '@trycompai/design-system';

export function AdminOrgDangerDialogs({
  orgName,
  orgSlug,
  deactivateOpen,
  deleteOpen,
  confirmValue,
  deleteConfirmValue,
  deleting,
  onDeactivateOpenChange,
  onDeleteOpenChange,
  onConfirmValueChange,
  onDeleteConfirmValueChange,
  onConfirmDeactivate,
  onConfirmDelete,
}: {
  orgName: string;
  orgSlug: string;
  deactivateOpen: boolean;
  deleteOpen: boolean;
  confirmValue: string;
  deleteConfirmValue: string;
  deleting: boolean;
  onDeactivateOpenChange: (open: boolean) => void;
  onDeleteOpenChange: (open: boolean) => void;
  onConfirmValueChange: (value: string) => void;
  onDeleteConfirmValueChange: (value: string) => void;
  onConfirmDeactivate: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <>
      <AlertDialog open={deactivateOpen} onOpenChange={onDeactivateOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate organization</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke access for all members of <strong>{orgName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <Label htmlFor="confirm-deactivate">Type &apos;deactivate&apos; to confirm</Label>
            <Input
              id="confirm-deactivate"
              value={confirmValue}
              onChange={(event) => onConfirmValueChange(event.target.value)}
              placeholder="deactivate"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onConfirmValueChange('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onConfirmDeactivate}
              disabled={confirmValue !== 'deactivate'}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete organization</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. All customer data for <strong>{orgName}</strong> will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <Label htmlFor="confirm-delete">
              Type the organization slug <code className="font-mono">{orgSlug}</code> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={deleteConfirmValue}
              onChange={(event) => onDeleteConfirmValueChange(event.target.value)}
              placeholder={orgSlug}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onDeleteConfirmValueChange('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={deleteConfirmValue !== orgSlug || deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
