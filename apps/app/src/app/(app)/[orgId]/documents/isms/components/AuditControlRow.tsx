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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableCell,
  TableRow,
  Textarea,
} from '@trycompai/design-system';
import { Edit, TrashCan } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { IsmsAuditControl } from '../isms-types';
import {
  auditControlSchema,
  toControlPayload,
  type AuditControlFormValues,
} from './audit-schema';
import {
  CONTROL_RESULTS,
  CONTROL_RESULT_LABELS,
} from './internal-audit-constants';

const NO_RESULT = 'no-result';

/** Results that should prompt the customer to raise a linked finding. */
export type RaisedResult = 'nonconformity_raised' | 'observation_raised';

interface AuditControlRowProps {
  control: IsmsAuditControl;
  canEdit: boolean;
  onUpdateControl: (controlId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteControl: (controlId: string) => Promise<void>;
  /** Called after a result is saved as non-conformity / observation, so the
   * findings section can open a linked-finding form pre-filled from this row. */
  onResultRaised?: (control: IsmsAuditControl, result: RaisedResult) => void;
}

function toFormValues(control: IsmsAuditControl): AuditControlFormValues {
  return {
    controlRef: control.controlRef,
    whatWasTested: control.whatWasTested,
    whereToFind: control.whereToFind,
    notes: control.notes ?? '',
  };
}

/**
 * One Controls Tested row. The Result dropdown saves immediately (the primary
 * per-row workflow); the text columns and notes are edited via the row's edit
 * mode. Seeded rows are editable and deletable like custom rows — nothing
 * re-seeds an existing audit, so removals stick.
 */
export function AuditControlRow({
  control: controlRow,
  canEdit,
  onUpdateControl,
  onDeleteControl,
  onResultRaised,
}: AuditControlRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<AuditControlFormValues>({
    resolver: zodResolver(auditControlSchema),
    mode: 'onChange',
    defaultValues: toFormValues(controlRow),
  });

  useEffect(() => {
    if (!isEditing) reset(toFormValues(controlRow));
  }, [controlRow, isEditing, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onUpdateControl(controlRow.id, toControlPayload(values));
    } catch {
      return;
    }
    setIsEditing(false);
  });

  const handleResultChange = async (next: string | null) => {
    setIsSavingResult(true);
    try {
      await onUpdateControl(controlRow.id, {
        result: !next || next === NO_RESULT ? null : next,
      });
    } catch {
      // Error already surfaced via toast by the caller.
      return;
    } finally {
      setIsSavingResult(false);
    }
    // Ticket flow: a raised non-conformity / observation prompts the customer
    // to record a finding linked back to this row.
    if (next === 'nonconformity_raised' || next === 'observation_raised') {
      onResultRaised?.(controlRow, next);
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setIsDeleting(true);
    try {
      await onDeleteControl(controlRow.id);
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
          <Controller
            control={control}
            name="controlRef"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} aria-label="Control reference" />
            )}
          />
        </TableCell>
        <TableCell>
          <Controller
            control={control}
            name="whatWasTested"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} rows={2} aria-label="What was tested" />
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
        <TableCell>—</TableCell>
        <TableCell>
          <Controller
            control={control}
            name="notes"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} rows={2} aria-label="Notes" />
            )}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                reset(toFormValues(controlRow));
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
        <span className="font-medium">{controlRow.controlRef}</span>
      </TableCell>
      <TableCell>{controlRow.whatWasTested || '—'}</TableCell>
      <TableCell>{controlRow.whereToFind || '—'}</TableCell>
      <TableCell>
        {canEdit ? (
          <Select
            value={controlRow.result ?? NO_RESULT}
            onValueChange={(next) => void handleResultChange(next)}
            disabled={isSavingResult}
          >
            <SelectTrigger aria-label={`Result for ${controlRow.controlRef}`}>
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_RESULT}>Not set</SelectItem>
              {CONTROL_RESULTS.map((result) => (
                <SelectItem key={result} value={result}>
                  {CONTROL_RESULT_LABELS[result]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : controlRow.result ? (
          CONTROL_RESULT_LABELS[controlRow.result]
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>{controlRow.notes || '—'}</TableCell>
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
              aria-label={`Edit ${controlRow.controlRef}`}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirmOpen(true)}
              disabled={isDeleting}
              loading={isDeleting}
              iconLeft={<TrashCan size={16} />}
              aria-label={`Delete ${controlRow.controlRef}`}
            />
          </div>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this control row?</AlertDialogTitle>
                <AlertDialogDescription>
                  Findings linked to it keep their clause text but lose the row link. Removed
                  seeded rows are not re-added. This cannot be undone.
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
