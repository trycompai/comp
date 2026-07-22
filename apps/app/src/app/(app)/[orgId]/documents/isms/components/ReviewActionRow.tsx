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
  Field,
  FieldError,
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
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { IsmsManagementReview, IsmsReviewAction } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import {
  REVIEW_ACTION_STATUSES,
  REVIEW_ACTION_STATUS_LABELS,
  fullActionReference,
} from './management-review-constants';
import {
  reviewActionSchema,
  toActionPayload,
  type ReviewActionFormValues,
} from './management-review-schema';

const NO_OWNER = 'no-owner';

interface ReviewActionRowProps {
  review: IsmsManagementReview;
  action: IsmsReviewAction;
  canEdit: boolean;
  /** Signed review: this row stays editable (tracks to closure) but not deletable. */
  locked: boolean;
  memberOptions: ApproverOption[];
  onUpdateAction: (actionId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteAction: (actionId: string) => Promise<void>;
}

function toFormValues(action: IsmsReviewAction): ReviewActionFormValues {
  return {
    description: action.description,
    ownerMemberId: action.ownerMemberId ?? '',
    dueDate: action.dueDate?.slice(0, 10) ?? '',
    status: action.status,
  };
}

/**
 * One action arising. The Status dropdown saves immediately (tracking to
 * closure is the primary per-row workflow — it stays live even after the
 * review is signed); the other fields are edited via the row's edit mode.
 */
export function ReviewActionRow({
  review,
  action,
  canEdit,
  locked,
  memberOptions,
  onUpdateAction,
  onDeleteAction,
}: ReviewActionRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const option of memberOptions) map[option.id] = option.name;
    return map;
  }, [memberOptions]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting, dirtyFields },
  } = useForm<ReviewActionFormValues>({
    resolver: zodResolver(reviewActionSchema),
    mode: 'onChange',
    defaultValues: toFormValues(action),
  });

  useEffect(() => {
    if (!isEditing) reset(toFormValues(action));
  }, [action, isEditing, reset]);

  const reference = fullActionReference(review.reference, action.reference);

  const handleSave = handleSubmit(async (values) => {
    // Patch only what changed: an untouched owner (possibly a former member)
    // must not be re-submitted — the server validates PROVIDED owners against
    // the active roster — and a signed review accepts only tracking fields.
    const full = toActionPayload(values);
    const patch = Object.fromEntries(
      Object.entries(full).filter(
        ([key]) => dirtyFields[key as keyof ReviewActionFormValues],
      ),
    );
    if (Object.keys(patch).length > 0) {
      try {
        await onUpdateAction(action.id, patch);
      } catch {
        return;
      }
    }
    setIsEditing(false);
  });

  const handleStatusChange = async (next: string | null) => {
    if (!next) return;
    setIsSavingStatus(true);
    try {
      await onUpdateAction(action.id, { status: next });
    } catch {
      // Error already surfaced via toast by the caller.
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setIsDeleting(true);
    try {
      await onDeleteAction(action.id);
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
          <span className="font-medium">{reference}</span>
        </TableCell>
        <TableCell>
          <Field>
            <Controller
              control={control}
              name="description"
              render={({ field: { ref: _ref, ...field }, fieldState }) => (
                <>
                  {/* Part of the signed minutes — frozen once the chair signs. */}
                  <Textarea
                    {...field}
                    rows={2}
                    aria-label="Action description"
                    disabled={locked}
                  />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </>
              )}
            />
          </Field>
        </TableCell>
        <TableCell>
          <Controller
            control={control}
            name="ownerMemberId"
            render={({ field }) => (
              <Select
                value={field.value || NO_OWNER}
                onValueChange={(next) => field.onChange(next === NO_OWNER ? '' : next)}
              >
                <SelectTrigger aria-label="Action owner">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_OWNER}>Unassigned</SelectItem>
                  {memberOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </TableCell>
        <TableCell>
          <Controller
            control={control}
            name="dueDate"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} type="date" aria-label="Action due date" />
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
                reset(toFormValues(action));
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
        <span className="font-medium">{reference}</span>
      </TableCell>
      <TableCell>{action.description}</TableCell>
      <TableCell>
        {action.ownerMemberId
          ? (memberNameById[action.ownerMemberId] ?? 'Former member')
          : '—'}
      </TableCell>
      <TableCell>{action.dueDate?.slice(0, 10) ?? '—'}</TableCell>
      <TableCell>
        {canEdit ? (
          <Select
            value={action.status}
            onValueChange={(next) => void handleStatusChange(next)}
            disabled={isSavingStatus}
          >
            <SelectTrigger aria-label={`Status for ${reference}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_ACTION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {REVIEW_ACTION_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          REVIEW_ACTION_STATUS_LABELS[action.status]
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
              aria-label={`Edit ${reference}`}
            />
            {!locked ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setConfirmOpen(true)}
                disabled={isDeleting}
                loading={isDeleting}
                iconLeft={<TrashCan size={16} />}
                aria-label={`Delete ${reference}`}
              />
            ) : null}
          </div>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete action {reference}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the action from the review&apos;s outputs and from
                  every later review&apos;s carried-forward list. This cannot be undone.
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
