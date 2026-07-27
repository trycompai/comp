import { db } from '@db';
import type { Prisma } from '@db';
import { reviewConclusionSentence } from './management-review-defaults';
import { parseReviewAttendees } from './management-review';
import type { ReviewActionExportRow, ReviewExportRow } from './types';

/**
 * Extra data the Management Review document (9.3) needs at export time but
 * that isn't on the review rows: display names for action owners (actions
 * store a plain memberId, no FK). Attendee and chair names are already frozen
 * on the review row itself. Resolved once and frozen into the version snapshot
 * so a historical export re-renders byte-faithfully with the names that were
 * current at publish.
 */
export interface ManagementReviewExtras {
  /** memberId → display name (name, else email, else a placeholder). */
  memberNames: Record<string, string>;
}

type Client = Prisma.TransactionClient | typeof db;

function memberDisplayName(
  user: { name: string | null; email: string | null } | null,
): string {
  return user?.name?.trim() || user?.email?.trim() || 'Unknown member';
}

/** Load the Management Review document's export extras for an organization. */
export async function loadManagementReviewExtras({
  organizationId,
  client,
}: {
  organizationId: string;
  client?: Client;
}): Promise<ManagementReviewExtras> {
  const prisma = client ?? db;

  const members = await prisma.member.findMany({
    where: { organizationId },
    select: { id: true, user: { select: { name: true, email: true } } },
  });

  const memberNames: Record<string, string> = {};
  for (const member of members) {
    memberNames[member.id] = memberDisplayName(member.user);
  }

  return { memberNames };
}

/** The review shape mapReviews consumes (EXPORT_DOCUMENT_INCLUDE's reviews). */
export type ReviewWithExportIncludes = Prisma.IsmsManagementReviewGetPayload<{
  include: { inputs: true; actions: true };
}>;

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  complete: 'Complete',
};

export const REVIEW_ACTION_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  closed: 'Closed',
};

function formatDateYmd(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function mapAction(
  review: ReviewWithExportIncludes,
  action: ReviewWithExportIncludes['actions'][number],
  extras: ManagementReviewExtras,
): ReviewActionExportRow {
  return {
    // Actions store the short per-review sequence ("A01"); the document (and
    // UI) always show the full reference.
    reference: `${review.reference}-${action.reference}`,
    description: action.description,
    ownerName: action.ownerMemberId
      ? (extras.memberNames[action.ownerMemberId] ?? 'Former member')
      : '',
    dueDate: formatDateYmd(action.dueDate) ?? '',
    status: REVIEW_ACTION_STATUS_LABELS[action.status] ?? action.status,
  };
}

/**
 * Map review rows (with their inputs and actions) into export rows, resolving
 * owner names and humanizing enum labels. All reviews render — a planned
 * review appears with its agenda (the pre-meeting agenda pack), which is the
 * honest state of the programme. `reviews` must be in position order: each
 * review's carried-forward list is computed from the reviews BEFORE it (open
 * actions only), which is how actions reach the next review's input (a)
 * without ever being copied.
 */
export function mapReviews(
  reviews: ReviewWithExportIncludes[],
  extras: ManagementReviewExtras,
): ReviewExportRow[] {
  return reviews.map((review, index) => ({
    reference: review.reference,
    meetingDate: formatDateYmd(review.meetingDate),
    recordedOn: review.recordedAt.toISOString().slice(0, 10),
    chairName: review.chairName ?? '',
    attendees: parseReviewAttendees(review.attendees).map(
      (attendee) => attendee.name,
    ),
    status: REVIEW_STATUS_LABELS[review.status] ?? review.status,
    conclusion: review.conclusionVerdict
      ? reviewConclusionSentence({
          verdict: review.conclusionVerdict,
          meetingDate: formatDateYmd(review.meetingDate),
        })
      : null,
    conclusionNotes: review.conclusionNotes,
    decisionsText: review.decisionsText,
    changesText: review.changesText,
    signoffChairName: review.signoffChairName ?? '',
    signoffChairDate: formatDateYmd(review.signoffChairDate) ?? '',
    inputs: review.inputs.map((input) => ({
      inputRef: input.inputRef,
      whatItCovers: input.whatItCovers,
      whereToFind: input.whereToFind,
      discussionNotes: input.discussionNotes ?? '',
      discussed: input.discussed ? 'Yes' : 'No',
    })),
    actions: review.actions.map((action) => mapAction(review, action, extras)),
    carriedForward: reviews
      .slice(0, index)
      .flatMap((prior) =>
        prior.actions
          .filter((action) => action.status !== 'closed')
          .map((action) => mapAction(prior, action, extras)),
      ),
  }));
}
