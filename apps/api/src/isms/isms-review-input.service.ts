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
import type {
  CreateReviewInputInput,
  UpdateReviewInputInput,
} from './registers/register-registry';

/**
 * CRUD for a review's Inputs (9.3.2) rows (clause 9.3, CS-726). Ten default
 * rows are seeded per review at creation (seedReviewInputsIfMissing); the
 * customer adds discussion notes during the meeting, ticks Discussed?, and may
 * add, edit, or remove rows freely — until the chair signs, which locks the
 * review's minutes (the sign-off must be cleared to edit them again).
 */
@Injectable()
export class IsmsReviewInputService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateReviewInputInput;
  }) {
    const review = await this.requireReview({
      reviewId: dto.reviewId,
      documentId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      // Same per-document lock submit/approve take, so an edit can't race the
      // submission's completeness check.
      await lockDocument(tx, review.documentId);
      // Signed state re-read UNDER the lock: a concurrent sign-off can commit
      // after the pre-read, and the locked minutes must win (TOCTOU).
      await this.assertReviewUnsigned({ tx, reviewId: review.id });
      const position =
        dto.position ?? (await this.nextPosition({ tx, reviewId: review.id }));
      await invalidateApprovalIfNeeded({ tx, documentId: review.documentId });
      return tx.ismsReviewInput.create({
        data: {
          reviewId: review.id,
          documentId: review.documentId,
          inputRef: dto.inputRef,
          whatItCovers: dto.whatItCovers ?? '',
          whereToFind: dto.whereToFind ?? '',
          discussionNotes: dto.discussionNotes?.trim() || null,
          discussed: dto.discussed ?? false,
          source: 'manual',
          position,
        },
      });
    });
  }

  async update({
    inputId,
    organizationId,
    dto,
  }: {
    inputId: string;
    organizationId: string;
    dto: UpdateReviewInputInput;
  }) {
    const input = await this.requireInput({ inputId, organizationId });

    return db.$transaction(async (tx) => {
      await lockDocument(tx, input.documentId);
      // Signed state re-read UNDER the lock (see create).
      await this.assertReviewUnsigned({ tx, reviewId: input.reviewId });
      await invalidateApprovalIfNeeded({ tx, documentId: input.documentId });
      return tx.ismsReviewInput.update({
        where: { id: inputId },
        data: {
          inputRef: dto.inputRef ?? undefined,
          whatItCovers: dto.whatItCovers ?? undefined,
          whereToFind: dto.whereToFind ?? undefined,
          discussionNotes:
            dto.discussionNotes === undefined
              ? undefined
              : dto.discussionNotes?.trim() || null,
          discussed: dto.discussed ?? undefined,
          position: dto.position ?? undefined,
          // An edited seed row is the customer's row now — record the
          // override like every other ISMS register (audit-controls precedent).
          source: 'manual',
        },
      });
    });
  }

  async remove({
    inputId,
    organizationId,
  }: {
    inputId: string;
    organizationId: string;
  }) {
    const input = await this.requireInput({ inputId, organizationId });
    await db.$transaction(async (tx) => {
      await lockDocument(tx, input.documentId);
      // Signed state re-read UNDER the lock (see create).
      await this.assertReviewUnsigned({ tx, reviewId: input.reviewId });
      await invalidateApprovalIfNeeded({ tx, documentId: input.documentId });
      await tx.ismsReviewInput.delete({ where: { id: inputId } });
    });
    return { success: true };
  }

  /** A signed review's Inputs table is part of the chair-approved minutes. */
  private async assertReviewUnsigned({
    tx,
    reviewId,
  }: {
    tx: Prisma.TransactionClient;
    reviewId: string;
  }): Promise<void> {
    const lock = await loadReviewLockState({ tx, reviewId });
    if (lock.signed) {
      throw new BadRequestException(
        `Review ${lock.reference} is signed and locked. Clear the chair sign-off to edit its inputs.`,
      );
    }
  }

  private async nextPosition({
    tx,
    reviewId,
  }: {
    tx: Prisma.TransactionClient;
    reviewId: string;
  }) {
    const last = await tx.ismsReviewInput.findFirst({
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

  private async requireInput({
    inputId,
    organizationId,
  }: {
    inputId: string;
    organizationId: string;
  }) {
    const input = await db.ismsReviewInput.findFirst({
      where: {
        id: inputId,
        review: { document: { organizationId, type: 'management_review' } },
      },
    });
    if (!input) {
      throw new NotFoundException('Review input not found');
    }
    return input;
  }
}
