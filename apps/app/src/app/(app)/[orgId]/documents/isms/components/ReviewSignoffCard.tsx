'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Button,
  Grid,
  Heading,
  HStack,
  Input,
  Stack,
  Text,
} from '@trycompai/design-system';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { IsmsManagementReview } from '../isms-types';
import { isReviewSigned } from './management-review-constants';
import {
  reviewSignoffSchema,
  type ReviewSignoffFormValues,
} from './management-review-schema';
import { IsmsFieldLabel } from './shared';

interface ReviewSignoffCardProps {
  review: IsmsManagementReview;
  canEdit: boolean;
  onSave: (values: ReviewSignoffFormValues) => Promise<void>;
}

function toFormValues(review: IsmsManagementReview): ReviewSignoffFormValues {
  return {
    signoffChairName: review.signoffChairName ?? '',
    signoffChairDate: review.signoffChairDate?.slice(0, 10) ?? '',
  };
}

/**
 * The review's single sign-off slot: the chair signs (name free text + date).
 * Once both are set the review is locked — its minutes are the chair-approved
 * record; clearing the signature here unlocks it. The slot renders as the
 * Sign-off table in the generated clause-9.3 document.
 */
export function ReviewSignoffCard({ review, canEdit, onSave }: ReviewSignoffCardProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<ReviewSignoffFormValues>({
    resolver: zodResolver(reviewSignoffSchema),
    mode: 'onChange',
    defaultValues: toFormValues(review),
  });

  // Re-sync only when the PERSISTED sign-off values change (own save landing),
  // not on every review refresh — a sibling register update must not discard
  // unsaved sign-off input.
  const persistedFingerprint = JSON.stringify(toFormValues(review));
  useEffect(() => {
    reset(JSON.parse(persistedFingerprint) as ReviewSignoffFormValues);
  }, [persistedFingerprint, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onSave(values);
    } catch {
      // Error already surfaced via toast by the caller; keep the edits.
    }
  });

  const signed = isReviewSigned(review);

  return (
    <Stack gap="3">
      <HStack align="center" justify="between" gap="3">
        <HStack align="center" gap="2">
          <Heading level="5">Sign-off</Heading>
          <Badge variant="secondary">{signed ? 'Signed' : 'Not signed'}</Badge>
        </HStack>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSave}
            disabled={!isDirty || isSubmitting}
            loading={isSubmitting}
          >
            Save sign-off
          </Button>
        ) : null}
      </HStack>
      <Text size="sm" variant="muted">
        The chair signs the completed review. Once name and date are both set the review locks
        (actions still track to closure); clearing them unlocks it.
      </Text>
      <Grid cols={{ base: '1', md: '2' }} gap="3">
        <IsmsFieldLabel label="Chair (Top Management) — signatory">
          <Controller
            control={control}
            name="signoffChairName"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input
                {...field}
                aria-label="Chair signatory name"
                placeholder="Name and title"
                disabled={!canEdit}
              />
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Date signed">
          <Controller
            control={control}
            name="signoffChairDate"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input
                {...field}
                type="date"
                aria-label="Chair sign-off date"
                disabled={!canEdit}
              />
            )}
          />
        </IsmsFieldLabel>
      </Grid>
    </Stack>
  );
}
