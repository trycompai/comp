import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { isReviewSigned } from './documents/management-review';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';
import { parseOptionalDate } from './utils/parse-optional-date';
import type {
  CreateReviewActionInput,
  UpdateReviewActionInput,
} from './registers/register-registry';

/**
 * CRUD for a review's Actions arising (9.3.3, CS-726). The reference is
 * server-generated ("A01", per-review sequence — displayed as
 * "MR-YYYY-NN-A01") and immutable. Open actions carry forward automatically
 * to the next review's input (a), computed at display/export time. Signing a
 * review freezes WHICH actions arose (no create/delete), but existing actions
 * stay fully updatable — the ticket's "actions still track to closure after
 * that".
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
    if (isReviewSigned(review)) {
      throw new BadRequestException(
        `Review ${review.reference} is signed and locked. Clear the chair sign-off to add actions.`,
      );
    }
    const ownerMemberId = await this.resolveMember({
      memberId: dto.ownerMemberId,
      organizationId,
    });
    const dueDate = parseOptionalDate(dto.dueDate);

    return db.$transaction(async (tx) => {
      // The lock also serializes reference generation, so concurrent creates
      // can never both compute the same next "A-NN".
      await lockDocument(tx, review.documentId);
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
    // Deliberately NOT gated on the review being signed: actions track to
    // closure after sign-off (owner, due date, and status stay live).
    const action = await this.requireAction({ actionId, organizationId });
    const ownerMemberId = await this.resolveMember({
      memberId: dto.ownerMemberId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      // Same per-document lock submit/approve take, so an edit can't race the
      // submission's completeness check.
      await lockDocument(tx, action.documentId);
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
    if (isReviewSigned(action.review)) {
      throw new BadRequestException(
        `Review ${action.review.reference} is signed and locked. Clear the chair sign-off to remove actions.`,
      );
    }
    await db.$transaction(async (tx) => {
      await lockDocument(tx, action.documentId);
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
      include: {
        review: {
          select: {
            reference: true,
            signoffChairName: true,
            signoffChairDate: true,
          },
        },
      },
    });
    if (!action) {
      throw new NotFoundException('Review action not found');
    }
    return action;
  }
}
