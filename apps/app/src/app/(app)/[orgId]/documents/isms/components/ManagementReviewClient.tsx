'use client';

import { Stack } from '@trycompai/design-system';
import { toast } from 'sonner';
import type {
  IsmsDocument as IsmsDocumentData,
  IsmsReviewAttendee,
} from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import { ProcedureCard } from './ProcedureCard';
import type { ReviewHandlers } from './ReviewCard';
import { ReviewsList } from './ReviewsList';
import {
  parseProcedure,
  reviewValidationMessages,
} from './management-review-constants';
import {
  toActionPayload,
  toInputPayload,
  toOutputsPayload,
  toReviewPayload,
  toReviewSignoffPayload,
} from './management-review-schema';

interface ManagementReviewClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
  memberOptions: ApproverOption[];
  /** Top Management holder(s) from ISMS > Roles (5.3) — the chair dropdown. */
  chairOptions?: string[];
}

const REVIEWS = 'reviews' as const;
const INPUTS = 'review-inputs' as const;
const ACTIONS = 'review-actions' as const;

async function run(action: Promise<void>, successMessage: string, failMessage: string) {
  try {
    await action;
    toast.success(successMessage);
  } catch (caught) {
    toast.error(caught instanceof Error ? caught.message : failMessage);
    // Re-throw so the calling form/row keeps its state on failure.
    throw caught;
  }
}

export function ManagementReviewClient({
  memberOptions,
  chairOptions = [],
  ...props
}: ManagementReviewClientProps) {
  return (
    <IsmsDocumentShell
      {...props}
      clause="9.3"
      title="Management Review"
      description="Record top management's reviews of the ISMS (ISO 27001 clause 9.3). Each review works through the Inputs table — the meeting agenda — then records the outputs, actions arising, and the chair's sign-off. Open actions carry forward to the next review automatically."
      sectionTitle="Review procedure"
      sectionDescription="Annual plus ad-hoc is the default cadence. Every field ships with auditor-defensible template text you can accept or edit."
      generateSuccessMessage="Restored the default procedure text"
      getSubmitBlockedReason={(document) => {
        const messages = reviewValidationMessages({
          procedure: parseProcedure(document.draftNarrative),
          reviews: Array.isArray(document.reviews) ? document.reviews : [],
        });
        return messages.length > 0
          ? `Complete the review record before submitting: ${messages.join(' ')}`
          : null;
      }}
    >
      {({ document, canManage, hook }) => {
        const reviews = Array.isArray(document.reviews) ? document.reviews : [];
        const validationMessages = reviewValidationMessages({
          procedure: parseProcedure(document.draftNarrative),
          reviews,
        });

        const handlers: ReviewHandlers = {
          onUpdateReview: (reviewId, values) =>
            run(
              hook.updateRow({ register: REVIEWS, id: reviewId, data: toReviewPayload(values) }),
              'Review updated',
              'Failed to update review',
            ),
          onDeleteReview: (reviewId) =>
            run(
              hook.deleteRow({ register: REVIEWS, id: reviewId }),
              'Review deleted',
              'Failed to delete review',
            ),
          onSaveAttendees: (reviewId, attendees: IsmsReviewAttendee[]) =>
            run(
              hook.updateRow({ register: REVIEWS, id: reviewId, data: { attendees } }),
              'Attendees updated',
              'Failed to update attendees',
            ),
          onSaveOutputs: (reviewId, values) =>
            run(
              hook.updateRow({ register: REVIEWS, id: reviewId, data: toOutputsPayload(values) }),
              'Outputs saved',
              'Failed to save outputs',
            ),
          onSaveSignoff: (reviewId, values) =>
            run(
              hook.updateRow({
                register: REVIEWS,
                id: reviewId,
                data: toReviewSignoffPayload(values),
              }),
              'Sign-off saved',
              'Failed to save sign-off',
            ),
          onCreateInput: (reviewId, values) =>
            run(
              hook.createRow({ register: INPUTS, data: { reviewId, ...toInputPayload(values) } }),
              'Input row added',
              'Failed to add input row',
            ),
          onUpdateInput: (inputId, payload) =>
            run(
              hook.updateRow({ register: INPUTS, id: inputId, data: payload }),
              'Input row updated',
              'Failed to update input row',
            ),
          onDeleteInput: (inputId) =>
            run(
              hook.deleteRow({ register: INPUTS, id: inputId }),
              'Input row deleted',
              'Failed to delete input row',
            ),
          onCreateAction: (reviewId, values) =>
            run(
              hook.createRow({
                register: ACTIONS,
                data: { reviewId, ...toActionPayload(values) },
              }),
              'Action added',
              'Failed to add action',
            ),
          onUpdateAction: (actionId, payload) =>
            run(
              hook.updateRow({ register: ACTIONS, id: actionId, data: payload }),
              'Action updated',
              'Failed to update action',
            ),
          onDeleteAction: (actionId) =>
            run(
              hook.deleteRow({ register: ACTIONS, id: actionId }),
              'Action deleted',
              'Failed to delete action',
            ),
        };

        return (
          <Stack gap="6">
            <ProcedureCard
              narrative={document.draftNarrative}
              canEdit={canManage}
              onSave={(procedure) =>
                run(
                  hook.saveNarrative({ procedure }),
                  'Procedure saved',
                  'Failed to save procedure',
                )
              }
            />
            <ReviewsList
              reviews={reviews}
              canEdit={canManage}
              memberOptions={memberOptions}
              chairOptions={chairOptions}
              validationMessages={validationMessages}
              onCreateReview={() =>
                run(
                  hook.createRow({ register: REVIEWS, data: {} }),
                  'Review created with the default template',
                  'Failed to create review',
                )
              }
              {...handlers}
            />
          </Stack>
        );
      }}
    </IsmsDocumentShell>
  );
}
