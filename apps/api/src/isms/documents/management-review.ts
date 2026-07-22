import { z } from 'zod';
import type { Prisma } from '@db';
import type { IsmsPlatformData } from './types';
import {
  defaultProcedureText,
  SEED_REVIEW_INPUT_DEFINITIONS,
} from './management-review-defaults';

type Tx = Prisma.TransactionClient;

/**
 * Narrative shape persisted on the Management Review document (clause 9.3):
 * the Procedure paragraph shown at the top of the page and rendered verbatim
 * into the generated document. The reviews themselves live in their own
 * registers.
 */
export const managementReviewNarrativeSchema = z.object({
  procedure: z.string().trim().min(1),
});

export type ManagementReviewNarrative = z.infer<
  typeof managementReviewNarrativeSchema
>;

/** Derive the default Procedure paragraph (hardcoded default, editable). */
export function deriveManagementReviewNarrative(
  data: IsmsPlatformData,
): ManagementReviewNarrative {
  return { procedure: defaultProcedureText(data.organizationName) };
}

/**
 * An attendee frozen at selection: the member id plus the display name that
 * was current when the customer picked them (the minutes must keep the names
 * of who attended THIS review even if People changes later). Stored as the
 * review row's `attendees` JSON array.
 */
export const reviewAttendeeSchema = z.object({
  memberId: z.string().min(1),
  name: z.string().trim().min(1),
});

export type ReviewAttendee = z.infer<typeof reviewAttendeeSchema>;

export const reviewAttendeesSchema = z.array(reviewAttendeeSchema);

/** Parse a stored attendees JSON value defensively (invalid → empty list). */
export function parseReviewAttendees(value: unknown): ReviewAttendee[] {
  const parsed = reviewAttendeesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

/** A review is signed once the chair's name and date are both captured. */
export function isReviewSigned(review: {
  signoffChairName: string | null;
  signoffChairDate: Date | string | null;
}): boolean {
  return Boolean(review.signoffChairName?.trim() && review.signoffChairDate);
}

/**
 * Clause-9.3 completeness check, shared by the submit-for-approval server gate
 * and the client Submit button (management-review-constants.ts mirrors it).
 * Requires the Procedure paragraph, at least one review instance (an ISMS with
 * no management review is the Stage-2 blocker this feature exists to remove),
 * and — per the ticket's document validation — a meeting date, chair, at least
 * one attendee, every input discussed, and the chair's signature on every
 * COMPLETE review. Planned / in-progress reviews render as an agenda pack and
 * never block. Returns unmet requirements; empty = ready.
 */
export function reviewValidationMessages({
  procedure,
  reviews,
}: {
  procedure: string | null;
  reviews: Array<{
    reference: string;
    status: string;
    hasMeetingDate: boolean;
    hasChair: boolean;
    attendeeCount: number;
    undiscussedInputCount: number;
    signed: boolean;
  }>;
}): string[] {
  const messages: string[] = [];
  if (!procedure?.trim()) {
    messages.push('The review procedure paragraph must not be empty.');
  }
  if (reviews.length === 0) {
    messages.push('At least one management review must be recorded.');
    return messages;
  }
  for (const review of reviews) {
    if (review.status !== 'complete') continue;
    if (!review.hasMeetingDate) {
      messages.push(
        `Review ${review.reference} is complete but has no meeting date.`,
      );
    }
    if (!review.hasChair) {
      messages.push(`Review ${review.reference} is complete but has no chair.`);
    }
    if (review.attendeeCount === 0) {
      messages.push(
        `Review ${review.reference} is complete but has no attendees.`,
      );
    }
    if (review.undiscussedInputCount > 0) {
      const count = review.undiscussedInputCount;
      messages.push(
        `Review ${review.reference} has ${count} input${count === 1 ? '' : 's'} not yet marked as discussed.`,
      );
    }
    if (!review.signed) {
      messages.push(
        `Review ${review.reference} is complete but has not been signed by the chair.`,
      );
    }
  }
  return messages;
}

/**
 * Seed the ten default Inputs (9.3.2) rows for a review, idempotently by
 * `inputKey`. Only creates seed rows that are missing — it NEVER deletes or
 * overwrites, so re-running can never clobber the customer's edits, notes, or
 * discussed ticks (same guarantee as seedAuditControlsIfMissing). Called when
 * a review instance is created.
 */
export async function seedReviewInputsIfMissing({
  tx,
  reviewId,
  documentId,
}: {
  tx: Tx;
  reviewId: string;
  documentId: string;
}): Promise<void> {
  const existing = await tx.ismsReviewInput.findMany({
    where: { reviewId },
    select: { inputKey: true, position: true },
  });
  const existingKeys = new Set(
    existing
      .map((input) => input.inputKey)
      .filter((key): key is string => !!key),
  );
  const missing = SEED_REVIEW_INPUT_DEFINITIONS.filter(
    (input) => !existingKeys.has(input.inputKey),
  );
  if (missing.length === 0) return;

  const maxPosition = existing.reduce(
    (max, input) => Math.max(max, input.position),
    -1,
  );

  await tx.ismsReviewInput.createMany({
    data: missing.map((input, index) => ({
      reviewId,
      documentId,
      inputKey: input.inputKey,
      inputRef: input.inputRef,
      whatItCovers: input.whatItCovers,
      whereToFind: input.whereToFind,
      source: 'derived' as const,
      derivedFrom: `seed:${input.inputKey}`,
      position: maxPosition + 1 + index,
    })),
    // Belt-and-braces with @@unique([reviewId, inputKey]): a concurrent
    // create racing this seed is absorbed silently.
    skipDuplicates: true,
  });
}
