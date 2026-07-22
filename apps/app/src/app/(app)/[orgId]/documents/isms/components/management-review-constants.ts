import type {
  IsmsManagementReview,
  IsmsReviewActionStatus,
  IsmsReviewAttendee,
  IsmsReviewConclusionVerdict,
  IsmsReviewStatus,
} from '../isms-types';

/**
 * Shared labels + the clause-9.3 client validation mirror for the Management
 * Review document (CS-726). The server enforces the same rules in
 * assertManagementReviewComplete (documents/management-review.ts) — keep in
 * sync.
 */

export const REVIEW_STATUSES = ['planned', 'in_progress', 'complete'] as const;

export const REVIEW_STATUS_LABELS: Record<IsmsReviewStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  complete: 'Complete',
};

export const REVIEW_CONCLUSION_VERDICTS = [
  'suitable',
  'adequate',
  'effective',
] as const;

/** The bracketed choices in the conclusion template, verbatim per the ticket. */
export const REVIEW_CONCLUSION_VERDICT_LABELS: Record<
  IsmsReviewConclusionVerdict,
  string
> = {
  suitable: 'Suitable',
  adequate: 'Adequate',
  effective: 'Effective',
};

/** The assembled conclusion sentence shown in the read view + generated doc. */
export function reviewConclusionSentence({
  verdict,
  meetingDate,
}: {
  verdict: IsmsReviewConclusionVerdict;
  meetingDate: string | null;
}): string {
  const choice = REVIEW_CONCLUSION_VERDICT_LABELS[verdict].toLowerCase();
  const reviewed = meetingDate
    ? `The information security management system was reviewed on ${meetingDate}.`
    : 'The information security management system was reviewed.';
  return `${reviewed} Overall, the ISMS was found to be ${choice} and no changes are required except those recorded in the outputs section below.`;
}

export const REVIEW_ACTION_STATUSES = [
  'open',
  'in_progress',
  'closed',
] as const;

export const REVIEW_ACTION_STATUS_LABELS: Record<
  IsmsReviewActionStatus,
  string
> = {
  open: 'Open',
  in_progress: 'In progress',
  closed: 'Closed',
};

/** Full display reference for an action: "MR-YYYY-NN-A01". */
export function fullActionReference(
  reviewReference: string,
  actionReference: string,
): string {
  return `${reviewReference}-${actionReference}`;
}

/** Parse a review's attendees defensively (stale/invalid JSON → empty list).
 * Mirrors the server's reviewAttendeeSchema: memberId AND name non-empty. */
export function parseAttendees(value: unknown): IsmsReviewAttendee[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is IsmsReviewAttendee =>
      !!entry &&
      typeof entry === 'object' &&
      typeof (entry as { memberId?: unknown }).memberId === 'string' &&
      (entry as { memberId: string }).memberId.length > 0 &&
      typeof (entry as { name?: unknown }).name === 'string' &&
      (entry as { name: string }).name.trim().length > 0,
  );
}

/** A review is signed (and locked) once the chair's name AND date are set. */
export function isReviewSigned(
  review: Pick<IsmsManagementReview, 'signoffChairName' | 'signoffChairDate'>,
): boolean {
  return Boolean(
    review.signoffChairName?.trim() && review.signoffChairDate,
  );
}

/**
 * Open actions from the reviews BEFORE this one (position order) — the
 * carry-forward into this review's input (a). Computed, never copied, so
 * their status keeps tracking to closure.
 */
export function carriedForwardActions(
  reviews: IsmsManagementReview[],
  review: IsmsManagementReview,
): Array<{ review: IsmsManagementReview; action: IsmsManagementReview['actions'][number] }> {
  const index = reviews.findIndex((row) => row.id === review.id);
  if (index <= 0) return [];
  return reviews.slice(0, index).flatMap((prior) =>
    prior.actions
      .filter((action) => action.status !== 'closed')
      .map((action) => ({ review: prior, action })),
  );
}

/**
 * Clause-9.3 readiness check — client mirror of the server submit gate
 * (reviewValidationMessages in apps/api documents/management-review.ts).
 * Planned / in-progress reviews (agenda packs) never block.
 */
export function reviewValidationMessages({
  procedure,
  reviews,
}: {
  procedure: string;
  reviews: IsmsManagementReview[];
}): string[] {
  const messages: string[] = [];
  if (!procedure.trim()) {
    messages.push('The review procedure paragraph must not be empty.');
  }
  if (reviews.length === 0) {
    messages.push('At least one management review must be recorded.');
    return messages;
  }
  for (const review of reviews) {
    if (review.status !== 'complete') continue;
    if (!review.meetingDate) {
      messages.push(
        `Review ${review.reference} is complete but has no meeting date.`,
      );
    }
    if (!review.chairName?.trim()) {
      messages.push(`Review ${review.reference} is complete but has no chair.`);
    }
    if (parseAttendees(review.attendees).length === 0) {
      messages.push(
        `Review ${review.reference} is complete but has no attendees.`,
      );
    }
    const undiscussed = review.inputs.filter((input) => !input.discussed).length;
    if (undiscussed > 0) {
      messages.push(
        `Review ${review.reference} has ${undiscussed} input${undiscussed === 1 ? '' : 's'} not yet marked as discussed.`,
      );
    }
    if (!isReviewSigned(review)) {
      messages.push(
        `Review ${review.reference} is complete but has not been signed by the chair.`,
      );
    }
  }
  return messages;
}

/** Read the Procedure paragraph out of the document's draft narrative. */
export function parseProcedure(narrative: unknown): string {
  if (
    narrative &&
    typeof narrative === 'object' &&
    'procedure' in narrative &&
    typeof (narrative as { procedure: unknown }).procedure === 'string'
  ) {
    return (narrative as { procedure: string }).procedure;
  }
  return '';
}
