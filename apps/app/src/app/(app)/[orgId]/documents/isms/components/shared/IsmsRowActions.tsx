import { Button, HStack } from '@trycompai/design-system';
import { TrashCan } from '@trycompai/design-system/icons';

export interface IsmsRowActionsProps {
  /** Persist the row's edits. */
  onSave: () => void;
  /** Remove the row. */
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
 * register row, so the affordance and spacing are identical everywhere.
 */
export function IsmsRowActions({
  onSave,
  onDelete,
  isDirty,
  isSaving,
  isDeleting,
  deleteLabel,
}: IsmsRowActionsProps) {
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
        onClick={onDelete}
        disabled={isSaving || isDeleting}
        loading={isDeleting}
        iconLeft={<TrashCan size={16} />}
        aria-label={deleteLabel}
      />
    </HStack>
  );
}
