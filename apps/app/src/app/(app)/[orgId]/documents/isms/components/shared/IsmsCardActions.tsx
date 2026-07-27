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
import { Edit, TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';

export interface IsmsCardActionsProps {
  /** Whether the card is currently in edit mode. */
  isEditing: boolean;
  /** Enter edit mode. */
  onEdit: () => void;
  /** Persist the card's edits. */
  onSave: () => void;
  /** Discard edits and return to read mode. */
  onCancel: () => void;
  /** Remove the entry. Called only after the user confirms. */
  onDelete: () => void;
  /** Whether the card has unsaved edits (gates the Save button). */
  isDirty: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  /** Accessible label for the edit button, e.g. "Edit objective". */
  editLabel: string;
  /** Accessible label for the delete button, e.g. "Delete objective". */
  deleteLabel: string;
}

/**
 * The shared header action cluster for an editable ISMS register card. Read mode
 * shows a single ghost Edit button; edit mode swaps in Save / Cancel plus the
 * destructive delete (which always opens a confirm dialog first). Keeps the
 * affordance and delete-confirm identical across every register.
 */
export function IsmsCardActions({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  isDirty,
  isSaving,
  isDeleting,
  editLabel,
  deleteLabel,
}: IsmsCardActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmDelete = () => {
    setConfirmOpen(false);
    onDelete();
  };

  if (!isEditing) {
    return (
      <HStack align="center" gap="1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onEdit}
          disabled={isDeleting}
          iconLeft={<Edit size={16} />}
          aria-label={editLabel}
        >
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
          loading={isDeleting}
          iconLeft={<TrashCan size={16} />}
          aria-label={deleteLabel}
        />
        <DeleteConfirm
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={handleConfirmDelete}
        />
      </HStack>
    );
  }

  return (
    <HStack align="center" gap="2">
      <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isSaving}>
        Cancel
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={onSave}
        disabled={!isDirty || isSaving}
        loading={isSaving}
      >
        Save
      </Button>
    </HStack>
  );
}

function DeleteConfirm({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the entry from the register. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
