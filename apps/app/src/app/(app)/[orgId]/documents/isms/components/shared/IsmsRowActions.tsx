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
  Button,
  HStack,
} from '@trycompai/design-system';
import { TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';

export interface IsmsRowActionsProps {
  /** Persist the row's edits. */
  onSave: () => void;
  /** Remove the row. Called only after the user confirms. */
  onDelete: () => void;
  /** Whether the row has unsaved edits (gates the Save button). */
  isDirty: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  /** Accessible label for the delete button, e.g. "Delete objective". */
  deleteLabel: string;
}

/**
 * The shared Save / Delete control pair rendered in every editable ISMS
 * register row, so the affordance and spacing are identical everywhere. The
 * Delete action always opens a lightweight confirm dialog before running.
 */
export function IsmsRowActions({
  onSave,
  onDelete,
  isDirty,
  isSaving,
  isDeleting,
  deleteLabel,
}: IsmsRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmDelete = () => {
    setConfirmOpen(false);
    onDelete();
  };

  return (
    <HStack align="center" gap="2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={onSave}
        disabled={!isDirty || isSaving || isDeleting}
        loading={isSaving}
      >
        Save
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setConfirmOpen(true)}
        disabled={isSaving || isDeleting}
        loading={isDeleting}
        iconLeft={<TrashCan size={16} />}
        aria-label={deleteLabel}
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this row?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the row from the register. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HStack>
  );
}
