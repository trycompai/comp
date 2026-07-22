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

interface MonitoringRowActionsProps {
  metricName: string;
  /** Custom metrics may be hard-deleted; seeded metrics only deactivate. */
  isCustom: boolean;
  isActive: boolean;
  isEditing: boolean;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onToggleActive: () => void;
  /** Called only after the user confirms the destructive delete. */
  onDelete: () => void;
}

/**
 * Header action cluster for a metric card: Edit / Save / Cancel, the
 * Deactivate-Reactivate toggle (the honest "remove" for seeded metrics), and
 * the confirm-gated Delete for custom metrics.
 */
export function MonitoringRowActions({
  metricName,
  isCustom,
  isActive,
  isEditing,
  isDirty,
  isValid,
  isSubmitting,
  isDeleting,
  isToggling,
  onEdit,
  onCancel,
  onSave,
  onToggleActive,
  onDelete,
}: MonitoringRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isEditing) {
    return (
      <HStack align="center" gap="2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onSave}
          disabled={!isDirty || !isValid || isSubmitting}
          loading={isSubmitting}
        >
          Save
        </Button>
      </HStack>
    );
  }

  return (
    <HStack align="center" gap="1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onEdit}
        disabled={isDeleting || isToggling}
        iconLeft={<Edit size={16} />}
        aria-label={`Edit ${metricName}`}
      >
        Edit
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onToggleActive}
        disabled={isDeleting}
        loading={isToggling}
      >
        {isActive ? 'Deactivate' : 'Reactivate'}
      </Button>
      {isCustom ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
          loading={isDeleting}
          iconLeft={<TrashCan size={16} />}
          aria-label={`Delete ${metricName}`}
        />
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this metric?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the custom metric and its entire
              measurement history. Deactivate instead to keep the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onDelete();
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HStack>
  );
}
