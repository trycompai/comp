'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
  Checkbox,
  Field,
  FieldError,
  Input,
  TableCell,
  TableRow,
  Textarea,
} from '@trycompai/design-system';
import { Edit, TrashCan } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { IsmsReviewInput } from '../isms-types';
import {
  reviewInputSchema,
  toInputPayload,
  type ReviewInputFormValues,
} from './management-review-schema';

interface ReviewInputRowProps {
  input: IsmsReviewInput;
  canEdit: boolean;
  onUpdateInput: (inputId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteInput: (inputId: string) => Promise<void>;
}

function toFormValues(input: IsmsReviewInput): ReviewInputFormValues {
  return {
    inputRef: input.inputRef,
    whatItCovers: input.whatItCovers,
    whereToFind: input.whereToFind,
    discussionNotes: input.discussionNotes ?? '',
  };
}

/**
 * One Inputs (9.3.2) row. The Discussed? checkbox saves immediately (ticking
 * through the agenda is the primary meeting workflow); the text columns and
 * notes are edited via the row's edit mode. Seeded rows are editable and
 * deletable like custom rows — nothing re-seeds an existing review, so
 * removals stick.
 */
export function ReviewInputRow({
  input,
  canEdit,
  onUpdateInput,
  onDeleteInput,
}: ReviewInputRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingDiscussed, setIsSavingDiscussed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<ReviewInputFormValues>({
    resolver: zodResolver(reviewInputSchema),
    mode: 'onChange',
    defaultValues: toFormValues(input),
  });

  useEffect(() => {
    if (!isEditing) reset(toFormValues(input));
  }, [input, isEditing, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onUpdateInput(input.id, toInputPayload(values));
    } catch {
      return;
    }
    setIsEditing(false);
  });

  const handleDiscussedChange = async (next: boolean) => {
    setIsSavingDiscussed(true);
    try {
      await onUpdateInput(input.id, { discussed: next });
    } catch {
      // Error already surfaced via toast by the caller.
    } finally {
      setIsSavingDiscussed(false);
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setIsDeleting(true);
    try {
      await onDeleteInput(input.id);
    } catch {
      // Error already surfaced via toast by the caller.
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <Field>
            <Controller
              control={control}
              name="inputRef"
              render={({ field: { ref: _ref, ...field }, fieldState }) => (
                <>
                  <Input {...field} aria-label="Input reference" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </>
              )}
            />
          </Field>
        </TableCell>
        <TableCell>
          <Controller
            control={control}
            name="whatItCovers"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} rows={2} aria-label="What it covers" />
            )}
          />
        </TableCell>
        <TableCell>
          <Controller
            control={control}
            name="whereToFind"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} rows={2} aria-label="Where to find it" />
            )}
          />
        </TableCell>
        <TableCell>
          <Controller
            control={control}
            name="discussionNotes"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} rows={2} aria-label="Discussion notes" />
            )}
          />
        </TableCell>
        <TableCell>—</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                reset(toFormValues(input));
                setIsEditing(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleSave}
              disabled={!isDirty || !isValid || isSubmitting}
              loading={isSubmitting}
            >
              Save
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <span className="font-medium">{input.inputRef}</span>
      </TableCell>
      <TableCell>{input.whatItCovers || '—'}</TableCell>
      <TableCell>{input.whereToFind || '—'}</TableCell>
      <TableCell>{input.discussionNotes || '—'}</TableCell>
      <TableCell>
        {canEdit ? (
          <Checkbox
            checked={input.discussed}
            onCheckedChange={(next) => void handleDiscussedChange(next === true)}
            disabled={isSavingDiscussed}
            aria-label={`Discussed: ${input.inputRef}`}
          />
        ) : input.discussed ? (
          'Yes'
        ) : (
          'No'
        )}
      </TableCell>
      {canEdit ? (
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              disabled={isDeleting}
              iconLeft={<Edit size={16} />}
              aria-label={`Edit ${input.inputRef}`}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirmOpen(true)}
              disabled={isDeleting}
              loading={isDeleting}
              iconLeft={<TrashCan size={16} />}
              aria-label={`Delete ${input.inputRef}`}
            />
          </div>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this input row?</AlertDialogTitle>
                <AlertDialogDescription>
                  The ten defaults are the ISO-mandated inputs — removing one is not recommended
                  without justification. Removed seeded rows are not re-added. This cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleDelete()} variant="destructive">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TableCell>
      ) : null}
    </TableRow>
  );
}
