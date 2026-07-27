import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { loadReviewLockState } from './documents/management-review';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';
import { parseOptionalDate } from './utils/parse-optional-date';
import type {
  CreateReviewActionInput,
  UpdateReviewActionInput,
} from './registers/register-registry';

/** The only action fields editable once its review is signed: the tracking
 * trio. The description (and ordering) are part of the signed minutes. */
const SIGNED_ACTION_EDITABLE_FIELDS = new Set([
  'ownerMemberId',
  'dueDate',
  'status',
]);

/**
 * CRUD for a review's Actions arising (9.3.3, CS-726). The reference is
 * server-generated ("A01", per-review sequence — displayed as
 * "MR-YYYY-NN-A01") and immutable. Open actions carry forward automatically
 * to the next review's input (a), computed at display/export time. Signing a
 * review freezes WHAT was agreed (no create/delete, description immutable),
 * but the tracking fields — owner, due date, status — stay live to closure:
 * the ticket's "actions still track to closure after that".
 */
@Injectable()
export class IsmsReviewActionService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateReviewActionInput;
  }) {
    const review = await this.requireReview({
      reviewId: dto.reviewId,
      documentId,
      organizationId,
    });
    const ownerMemberId = await this.resolveMember({
      memberId: dto.ownerMemberId,
      organizationId,
    });
    const dueDate = parseOptionalDate(dto.dueDate);

    return db.$transaction(async (tx) => {
      // The lock also serializes reference generation, so concurrent creates
      // can never both compute the same next "A-NN".
      await lockDocument(tx, review.documentId);
      // Signed state re-read UNDER the lock: a concurrent sign-off can commit
      // after the pre-read, and the locked minutes must win (TOCTOU).
      const lock = await loadReviewLockState({ tx, reviewId: review.id });
      if (lock.signed) {
        throw new BadRequestException(
          `Review ${lock.reference} is signed and locked. Clear the chair sign-off to add actions.`,
        );
      }
      const position =
        dto.position ?? (await this.nextPosition({ tx, reviewId: review.id }));
      await invalidateApprovalIfNeeded({ tx, documentId: review.documentId });
      return tx.ismsReviewAction.create({
        data: {
          reviewId: review.id,
          documentId: review.documentId,
          reference: await this.nextReference({ tx, reviewId: review.id }),
          description: dto.description,
          ownerMemberId: ownerMemberId ?? null,
          dueDate: dueDate ?? null,
          status: dto.status ?? 'open',
          position,
        },
      });
    });
  }

  async update({
    actionId,
    organizationId,
    dto,
  }: {
    actionId: string;
    organizationId: string;
    dto: UpdateReviewActionInput;
  }) {
    const action = await this.requireAction({ actionId, organizationId });
    const ownerMemberId = await this.resolveMember({
      memberId: dto.ownerMemberId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      // Same per-document lock submit/approve take, so an edit can't race the
      // submission's completeness check.
      await lockDocument(tx, action.documentId);
      // Once the review is signed, only the tracking trio (owner / due date /
      // status) stays editable — the description is part of the minutes.
      // Re-read UNDER the lock so a concurrent sign-off can't be raced.
      const lock = await loadReviewLockState({ tx, reviewId: action.reviewId });
      if (lock.signed) {
        const blocked = Object.entries(dto).some(
          ([key, value]) =>
            value !== undefined && !SIGNED_ACTION_EDITABLE_FIELDS.has(key),
        );
        if (blocked) {
          throw new BadRequestException(
            `Review ${lock.reference} is signed and locked. Only the owner, due date, and status of its actions can change; clear the chair sign-off to edit anything else.`,
          );
        }
      }
      await invalidateApprovalIfNeeded({ tx, documentId: action.documentId });
      return tx.ismsReviewAction.update({
        where: { id: actionId },
        data: {
          description: dto.description ?? undefined,
          ownerMemberId:
            dto.ownerMemberId === undefined ? undefined : ownerMemberId,
          dueDate: parseOptionalDate(dto.dueDate),
          status: dto.status ?? undefined,
          position: dto.position ?? undefined,
        },
      });
    });
  }

  async remove({
    actionId,
    organizationId,
  }: {
    actionId: string;
    organizationId: string;
  }) {
    const action = await this.requireAction({ actionId, organizationId });
    await db.$transaction(async (tx) => {
      await lockDocument(tx, action.documentId);
      // Signed state re-read UNDER the lock (see create).
      const lock = await loadReviewLockState({ tx, reviewId: action.reviewId });
      if (lock.signed) {
        throw new BadRequestException(
          `Review ${lock.reference} is signed and locked. Clear the chair sign-off to remove actions.`,
        );
      }
      await invalidateApprovalIfNeeded({ tx, documentId: action.documentId });
      await tx.ismsReviewAction.delete({ where: { id: actionId } });
    });
    return { success: true };
  }

  /**
   * Next "A-NN" for the review: max + 1 over the surviving rows, so deleting
   * an older action never reissues its number (deleting the newest frees it —
   * acceptable: actions are draft rows until the review is signed/published,
   * and every published version freezes its own actions in the version
   * contentSnapshot).
   */
  private async nextReference({
    tx,
    reviewId,
  }: {
    tx: Prisma.TransactionClient;
    reviewId: string;
  }): Promise<string> {
    const existing = await tx.ismsReviewAction.findMany({
      where: { reviewId },
      select: { reference: true },
    });
    const maxSequence = existing.reduce((max, action) => {
      const match = /^A(\d+)$/.exec(action.reference);
      return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
    }, 0);
    return `A${String(maxSequence + 1).padStart(2, '0')}`;
  }

  private async resolveMember({
    memberId,
    organizationId,
  }: {
    memberId: string | null | undefined;
    organizationId: string;
  }): Promise<string | null | undefined> {
    if (memberId === undefined) return undefined;
    const trimmed = memberId?.trim();
    if (!trimmed) return null;
    // Action owners must be active People members.
    const member = await db.member.findFirst({
      where: { id: trimmed, organizationId, deactivated: false },
    });
    if (!member) {
      throw new NotFoundException('Active member not found in organization');
    }
    return trimmed;
  }

  private async nextPosition({
    tx,
    reviewId,
  }: {
    tx: Prisma.TransactionClient;
    reviewId: string;
  }) {
    const last = await tx.ismsReviewAction.findFirst({
      where: { reviewId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? -1) + 1;
  }

  private async requireReview({
    reviewId,
    documentId,
    organizationId,
  }: {
    reviewId: string;
    documentId: string;
    organizationId: string;
  }) {
    const review = await db.ismsManagementReview.findFirst({
      where: {
        id: reviewId,
        documentId,
        document: { organizationId, type: 'management_review' },
      },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  private async requireAction({
    actionId,
    organizationId,
  }: {
    actionId: string;
    organizationId: string;
  }) {
    const action = await db.ismsReviewAction.findFirst({
      where: {
        id: actionId,
        review: { document: { organizationId, type: 'management_review' } },
      },
    });
    if (!action) {
      throw new NotFoundException('Review action not found');
    }
    return action;
  }
}
