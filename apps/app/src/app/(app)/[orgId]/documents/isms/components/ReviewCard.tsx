'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Grid,
  Heading,
  HStack,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Edit, Locked, TrashCan } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type {
  IsmsManagementReview,
  IsmsReviewAttendee,
} from '../isms-types';
import { AttendeesField } from './AttendeesField';
import { CarriedForwardActions } from './CarriedForwardActions';
import type { ApproverOption } from './IsmsApprovalSection';
import { ReviewActionsSection } from './ReviewActionsSection';
import { ReviewFields } from './ReviewFields';
import { ReviewInputsTable } from './ReviewInputsTable';
import { ReviewOutputsSection } from './ReviewOutputsSection';
import { ReviewSignoffCard } from './ReviewSignoffCard';
import {
  REVIEW_STATUS_LABELS,
  carriedForwardActions,
  isReviewSigned,
  reviewConclusionSentence,
} from './management-review-constants';
import {
  reviewDetailsSchema,
  type ReviewActionFormValues,
  type ReviewDetailsFormValues,
  type ReviewInputFormValues,
  type ReviewOutputsFormValues,
  type ReviewSignoffFormValues,
} from './management-review-schema';
import { IsmsRegisterCard, IsmsRegisterField } from './shared';

/** All mutations a review card (and its child sections) can perform. */
export interface ReviewHandlers {
  onUpdateReview: (reviewId: string, values: ReviewDetailsFormValues) => Promise<void>;
  onDeleteReview: (reviewId: string) => Promise<void>;
  onSaveAttendees: (reviewId: string, attendees: IsmsReviewAttendee[]) => Promise<void>;
  onSaveOutputs: (reviewId: string, values: ReviewOutputsFormValues) => Promise<void>;
  onSaveSignoff: (reviewId: string, values: ReviewSignoffFormValues) => Promise<void>;
  onCreateInput: (reviewId: string, values: ReviewInputFormValues) => Promise<void>;
  onUpdateInput: (inputId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteInput: (inputId: string) => Promise<void>;
  onCreateAction: (reviewId: string, values: ReviewActionFormValues) => Promise<void>;
  onUpdateAction: (actionId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteAction: (actionId: string) => Promise<void>;
}

interface ReviewCardProps extends ReviewHandlers {
  review: IsmsManagementReview;
  /** All reviews (position order) — the source of the carry-forward list. */
  reviews: IsmsManagementReview[];
  canEdit: boolean;
  memberOptions: ApproverOption[];
  chairOptions: string[];
}

function toFormValues(review: IsmsManagementReview): ReviewDetailsFormValues {
  return {
    meetingDate: review.meetingDate?.slice(0, 10) ?? '',
    chairName: review.chairName ?? '',
    status: review.status,
    conclusionVerdict: review.conclusionVerdict ?? '',
    conclusionNotes: review.conclusionNotes ?? '',
  };
}

export function ReviewCard({
  review,
  reviews,
  canEdit,
  memberOptions,
  chairOptions,
  onUpdateReview,
  onDeleteReview,
  onSaveAttendees,
  onSaveOutputs,
  onSaveSignoff,
  onCreateInput,
  onUpdateInput,
  onDeleteInput,
  onCreateAction,
  onUpdateAction,
  onDeleteAction,
}: ReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Signed = locked: the minutes are the chair-approved record. The server
  // rejects edits too; the UI mirrors it by disabling everything except the
  // sign-off slot (clearing the signature unlocks) and action tracking.
  const locked = isReviewSigned(review);
  const canEditContent = canEdit && !locked;
  const carried = carriedForwardActions(reviews, review);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<ReviewDetailsFormValues>({
    resolver: zodResolver(reviewDetailsSchema),
    mode: 'onChange',
    defaultValues: toFormValues(review),
  });

  useEffect(() => {
    if (!isEditing) reset(toFormValues(review));
  }, [review, isEditing, reset]);

  // If the review becomes signed while the details form is open (another
  // user signs, SWR refreshes), close the form — the server would reject the
  // save and the lock notice explains why.
  useEffect(() => {
    if (!canEditContent && isEditing) setIsEditing(false);
  }, [canEditContent, isEditing]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onUpdateReview(review.id, values);
    } catch {
      return;
    }
    setIsEditing(false);
  });

  const handleDelete = async () => {
    setConfirmOpen(false);
    setIsDeleting(true);
    try {
      await onDeleteReview(review.id);
    } catch {
      // Error already surfaced via toast by the caller.
    } finally {
      setIsDeleting(false);
    }
  };

  const headerActions = canEditContent ? (
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
          disabled={!isDirty || !isValid || isSubmitting}
          loading={isSubmitting}
        >
          Save
        </Button>
      </HStack>
    ) : (
      <HStack align="center" gap="1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          disabled={isDeleting}
          iconLeft={<Edit size={16} />}
          aria-label={`Edit review ${review.reference}`}
        >
          Edit details
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
          loading={isDeleting}
          iconLeft={<TrashCan size={16} />}
          aria-label={`Delete review ${review.reference}`}
        />
      </HStack>
    )
  ) : undefined;

  return (
    <IsmsRegisterCard
      header={
        <HStack align="center" gap="2" wrap="wrap">
          <Heading level="4">{review.reference}</Heading>
          <Badge variant="secondary">{REVIEW_STATUS_LABELS[review.status]}</Badge>
          {locked ? <Badge variant="secondary">Signed</Badge> : null}
        </HStack>
      }
      headerEnd={headerActions}
    >
      {isEditing && canEditContent ? (
        <ReviewFields control={control} chairOptions={chairOptions} />
      ) : (
        <Stack gap="6">
          {locked ? (
            <Alert variant="default" icon={<Locked />}>
              <Text size="sm">
                This review is signed by the chair and locked. Actions still track to closure;
                clear the sign-off below to edit anything else.
              </Text>
            </Alert>
          ) : null}

          <Grid cols={{ base: '1', md: '2' }} gap="3">
            <IsmsRegisterField label="Meeting date">
              {review.meetingDate?.slice(0, 10) ?? 'Not set'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Recorded on">
              {`${review.recordedAt.slice(0, 10)} — set by the platform, cannot be edited`}
            </IsmsRegisterField>
            <IsmsRegisterField label="Chair">
              {review.chairName || 'Not set — assigned in ISMS > Roles'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Conclusion">
              {review.conclusionVerdict
                ? `${reviewConclusionSentence({
                    verdict: review.conclusionVerdict,
                    meetingDate: review.meetingDate?.slice(0, 10) ?? null,
                  })}${review.conclusionNotes ? ` ${review.conclusionNotes}` : ''}`
                : 'No conclusion recorded yet — pick the verdict in Edit details.'}
            </IsmsRegisterField>
          </Grid>

          <AttendeesField
            review={review}
            canEdit={canEditContent}
            memberOptions={memberOptions}
            onSave={(attendees) => onSaveAttendees(review.id, attendees)}
          />

          {carried.length > 0 ? (
            <CarriedForwardActions entries={carried} memberOptions={memberOptions} />
          ) : null}

          <ReviewInputsTable
            review={review}
            canEdit={canEditContent}
            onCreateInput={(values) => onCreateInput(review.id, values)}
            onUpdateInput={onUpdateInput}
            onDeleteInput={onDeleteInput}
          />

          <ReviewOutputsSection
            review={review}
            canEdit={canEditContent}
            onSave={(values) => onSaveOutputs(review.id, values)}
          />

          <ReviewActionsSection
            review={review}
            canEdit={canEdit}
            locked={locked}
            memberOptions={memberOptions}
            onCreateAction={(values) => onCreateAction(review.id, values)}
            onUpdateAction={onUpdateAction}
            onDeleteAction={onDeleteAction}
          />

          <ReviewSignoffCard
            review={review}
            canEdit={canEdit}
            onSave={(values) => onSaveSignoff(review.id, values)}
          />
        </Stack>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review {review.reference}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the review, its inputs, and its actions arising. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </IsmsRegisterCard>
  );
}
