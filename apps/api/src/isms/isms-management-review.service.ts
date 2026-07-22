import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import {
  isReviewSigned,
  seedReviewInputsIfMissing,
  type ReviewAttendee,
} from './documents/management-review';
import {
  DEFAULT_REVIEW_CHANGES_TEXT,
  DEFAULT_REVIEW_DECISIONS_TEXT,
} from './documents/management-review-defaults';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';
import { parseOptionalDate } from './utils/parse-optional-date';
import {
  resolveReviewParticipantDefaults,
  validateReviewAttendees,
} from './utils/review-participants';
import type {
  CreateReviewInput,
  UpdateReviewInput,
} from './registers/register-registry';

/** The only fields editable once a review is signed: the sign-off slot itself
 * (so a mistaken signature can be corrected or cleared — clearing unlocks). */
const SIGNED_REVIEW_EDITABLE_FIELDS = new Set([
  'signoffChairName',
  'signoffChairDate',
]);

/**
 * CRUD for the Management Review instances register (clause 9.3, CS-726).
 * Every review is customer-created; the reference is server-generated
 * ("MR-YYYY-NN"), the chair and attendees default to the Top Management and
 * SPO holders from ISMS > Roles (5.3), the outputs ship with template text,
 * and the ten default Inputs (9.3.2) rows are seeded in the same transaction.
 * `recordedAt` is server-set and immutable (the honest-backdating guardrail).
 * Once signed by the chair, a review is locked except its own sign-off slot;
 * deleting a review cascades to its input rows and actions.
 */
@Injectable()
export class IsmsManagementReviewService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateReviewInput;
  }) {
    await this.requireDocument({ documentId, organizationId });
    const meetingDate = parseOptionalDate(dto.meetingDate);
    if (dto.attendees) {
      await validateReviewAttendees({
        attendees: dto.attendees,
        organizationId,
      });
    }

    return db.$transaction(async (tx) => {
      // The lock also serializes reference generation, so concurrent creates
      // can never both compute the same next "MR-YYYY-NN".
      await lockDocument(tx, documentId);
      const position =
        dto.position ?? (await this.nextPosition({ tx, documentId }));
      await invalidateApprovalIfNeeded({ tx, documentId });
      // Ticket defaults: chair = the Roles (5.3) Top Management holder,
      // attendees = Chair + SPO (for a 1-3 person org these may be the same
      // person — the dedupe accepts that). Explicit dto values win.
      const defaults = await resolveReviewParticipantDefaults({
        tx,
        organizationId,
      });
      const attendees: ReviewAttendee[] =
        dto.attendees ?? defaults.attendees;
      const review = await tx.ismsManagementReview.create({
        data: {
          documentId,
          reference: await this.nextReference({ tx, documentId }),
          meetingDate: meetingDate ?? null,
          chairName: dto.chairName?.trim() || defaults.chairName,
          attendees: attendees.map((attendee) => ({ ...attendee })),
          decisionsText: DEFAULT_REVIEW_DECISIONS_TEXT,
          changesText: DEFAULT_REVIEW_CHANGES_TEXT,
          position,
        },
      });
      // The default agenda the customer sees when they first open the review.
      await seedReviewInputsIfMissing({ tx, reviewId: review.id, documentId });
      return review;
    });
  }

  async update({
    reviewId,
    organizationId,
    dto,
  }: {
    reviewId: string;
    organizationId: string;
    dto: UpdateReviewInput;
  }) {
    const review = await this.requireReview({ reviewId, organizationId });
    this.assertEditableWhileSigned({ review, dto });
    if (dto.attendees) {
      await validateReviewAttendees({
        attendees: dto.attendees,
        organizationId,
      });
    }

    return db.$transaction(async (tx) => {
      // Same per-document lock submit/approve take, so an edit can't race the
      // submission's completeness check.
      await lockDocument(tx, review.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: review.documentId });
      return tx.ismsManagementReview.update({
        where: { id: reviewId },
        data: {
          meetingDate: parseOptionalDate(dto.meetingDate),
          chairName: this.optionalText(dto.chairName),
          attendees:
            dto.attendees === undefined
              ? undefined
              : dto.attendees.map((attendee) => ({ ...attendee })),
          status: dto.status ?? undefined,
          conclusionVerdict:
            dto.conclusionVerdict === undefined
              ? undefined
              : dto.conclusionVerdict,
          conclusionNotes: this.optionalText(dto.conclusionNotes),
          decisionsText: this.optionalText(dto.decisionsText),
          changesText: this.optionalText(dto.changesText),
          signoffChairName: this.optionalText(dto.signoffChairName),
          signoffChairDate: parseOptionalDate(dto.signoffChairDate),
          position: dto.position ?? undefined,
        },
      });
    });
  }

  async remove({
    reviewId,
    organizationId,
  }: {
    reviewId: string;
    organizationId: string;
  }) {
    const review = await this.requireReview({ reviewId, organizationId });
    if (isReviewSigned(review)) {
      throw new BadRequestException(
        `Review ${review.reference} is signed and locked and cannot be deleted. Clear the chair sign-off first.`,
      );
    }
    await db.$transaction(async (tx) => {
      await lockDocument(tx, review.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: review.documentId });
      // Cascades to the review's input rows and actions.
      await tx.ismsManagementReview.delete({ where: { id: reviewId } });
    });
    return { success: true };
  }

  /**
   * A signed review is locked: the minutes are the chair-approved record.
   * Only its own sign-off slot stays editable, so a signature can be
   * corrected or cleared (clearing unlocks the review). Action TRACKING is
   * deliberately not gated here — see IsmsReviewActionService.
   */
  private assertEditableWhileSigned({
    review,
    dto,
  }: {
    review: { reference: string; signoffChairName: string | null; signoffChairDate: Date | null };
    dto: UpdateReviewInput;
  }): void {
    if (!isReviewSigned(review)) return;
    const blocked = Object.entries(dto).some(
      ([key, value]) =>
        value !== undefined && !SIGNED_REVIEW_EDITABLE_FIELDS.has(key),
    );
    if (blocked) {
      throw new BadRequestException(
        `Review ${review.reference} is signed and locked. Clear the chair sign-off to edit it.`,
      );
    }
  }

  /** Three-state text field: undefined = leave, null/empty = clear. */
  private optionalText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    return value?.trim() || null;
  }

  /**
   * Next "MR-YYYY-NN" for the document: the year of creation plus a two-digit
   * per-document, per-year sequence. Max + 1 over the surviving rows, so
   * deleting an older review never reissues its number (deleting the newest
   * review frees its number — acceptable, since reviews are freely deletable
   * drafts until signed/published). Runs under the per-document lock.
   */
  private async nextReference({
    tx,
    documentId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
  }): Promise<string> {
    const year = new Date().getUTCFullYear();
    const prefix = `MR-${year}-`;
    const existing = await tx.ismsManagementReview.findMany({
      where: { documentId, reference: { startsWith: prefix } },
      select: { reference: true },
    });
    const maxSequence = existing.reduce((max, review) => {
      const sequence = Number.parseInt(
        review.reference.slice(prefix.length),
        10,
      );
      return Number.isNaN(sequence) ? max : Math.max(max, sequence);
    }, 0);
    return `${prefix}${String(maxSequence + 1).padStart(2, '0')}`;
  }

  private async nextPosition({
    tx,
    documentId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
  }) {
    const last = await tx.ismsManagementReview.findFirst({
      where: { documentId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? -1) + 1;
  }

  private async requireDocument({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    // Scope to the Management Review document type: review rows must never
    // attach to another ISMS document (they'd be invisible to the Clause 9.3
    // export).
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId, type: 'management_review' },
    });
    if (!document) {
      throw new NotFoundException('ISMS management review document not found');
    }
    return document;
  }

  private async requireReview({
    reviewId,
    organizationId,
  }: {
    reviewId: string;
    organizationId: string;
  }) {
    // Type-scoped like create: a review row can only ever live on THIS org's
    // Management Review document (belt-and-braces with the creation guard).
    const review = await db.ismsManagementReview.findFirst({
      where: {
        id: reviewId,
        document: { organizationId, type: 'management_review' },
      },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }
}
