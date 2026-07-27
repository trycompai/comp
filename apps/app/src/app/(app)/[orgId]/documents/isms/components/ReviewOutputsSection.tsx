'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Heading,
  HStack,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Edit } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { IsmsManagementReview } from '../isms-types';
import {
  reviewOutputsSchema,
  type ReviewOutputsFormValues,
} from './management-review-schema';
import { IsmsFieldLabel, IsmsRegisterField } from './shared';

interface ReviewOutputsSectionProps {
  review: IsmsManagementReview;
  canEdit: boolean;
  onSave: (values: ReviewOutputsFormValues) => Promise<void>;
}

function toFormValues(review: IsmsManagementReview): ReviewOutputsFormValues {
  return {
    decisionsText: review.decisionsText ?? '',
    changesText: review.changesText ?? '',
  };
}

/**
 * The Outputs (9.3.3) text pair: decisions on continual improvement and ISMS
 * changes required. Both ship with template text the customer edits or
 * overwrites; the actions arising table follows as its own section.
 */
export function ReviewOutputsSection({
  review,
  canEdit,
  onSave,
}: ReviewOutputsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<ReviewOutputsFormValues>({
    resolver: zodResolver(reviewOutputsSchema),
    mode: 'onChange',
    defaultValues: toFormValues(review),
  });

  useEffect(() => {
    if (!isEditing) reset(toFormValues(review));
  }, [review, isEditing, reset]);

  // If the review becomes signed (or the caller loses edit rights) while the
  // outputs editor is open, close it — otherwise the textareas would linger
  // with stale local edits and no Save action.
  useEffect(() => {
    if (!canEdit && isEditing) setIsEditing(false);
  }, [canEdit, isEditing]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onSave(values);
    } catch {
      return;
    }
    setIsEditing(false);
  });

  return (
    <Stack gap="3">
      <HStack align="center" justify="between" gap="3">
        <Heading level="5">Outputs (9.3.3)</Heading>
        {canEdit ? (
          isEditing ? (
            <HStack align="center" gap="2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  reset(toFormValues(review));
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
                disabled={!isDirty || isSubmitting}
                loading={isSubmitting}
              >
                Save
              </Button>
            </HStack>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              iconLeft={<Edit size={16} />}
              aria-label={`Edit outputs for ${review.reference}`}
            >
              Edit
            </Button>
          )
        ) : null}
      </HStack>
      <Text size="sm" variant="muted">
        Replace the template text with what was actually decided, or leave it as-is if nothing
        changed. Actions arising are recorded in the table below.
      </Text>

      {isEditing && canEdit ? (
        <Stack gap="3">
          <IsmsFieldLabel label="Decisions on continual improvement">
            <Controller
              control={control}
              name="decisionsText"
              render={({ field: { ref: _ref, ...field } }) => (
                <Textarea {...field} rows={3} aria-label="Decisions on continual improvement" />
              )}
            />
          </IsmsFieldLabel>
          <IsmsFieldLabel label="ISMS changes required">
            <Controller
              control={control}
              name="changesText"
              render={({ field: { ref: _ref, ...field } }) => (
                <Textarea {...field} rows={3} aria-label="ISMS changes required" />
              )}
            />
          </IsmsFieldLabel>
        </Stack>
      ) : (
        <Stack gap="3">
          <IsmsRegisterField label="Decisions on continual improvement">
            {review.decisionsText || '—'}
          </IsmsRegisterField>
          <IsmsRegisterField label="ISMS changes required">
            {review.changesText || '—'}
          </IsmsRegisterField>
        </Stack>
      )}
    </Stack>
  );
}
