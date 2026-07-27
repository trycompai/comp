import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';

/**
 * Org-level mapping between an ISMS document and the organization's Controls
 * (CS-437). Mirrors the Policy<->Control mapping but over the explicit
 * IsmsDocumentControlLink junction. Everything is org-scoped: the document and
 * every control must belong to the caller's organization.
 */
@Injectable()
export class IsmsDocumentControlService {
  async addControls({
    documentId,
    organizationId,
    controlIds,
  }: {
    documentId: string;
    organizationId: string;
    controlIds: string[];
  }) {
    await this.requireDocument({ documentId, organizationId });

    const uniqueControlIds = Array.from(new Set(controlIds));
    const controls = await db.control.findMany({
      where: { id: { in: uniqueControlIds }, organizationId },
      select: { id: true },
    });
    if (controls.length !== uniqueControlIds.length) {
      throw new BadRequestException(
        'One or more controls do not belong to the organization',
      );
    }

    // Mutating an approved document's control mappings invalidates its sign-off,
    // so revert it to draft in the same transaction as the write (mirrors the
    // register/narrative edits). Only a REAL change invalidates — an idempotent
    // re-link that inserts nothing must not downgrade an approved document.
    await db.$transaction(async (tx) => {
      // Take the per-document lock BEFORE writing links so the mutation is fully
      // serialized against approve() (which holds the same lock). invalidate is
      // only called on a real change, and the lock is re-entrant, so re-taking it
      // there is a no-op.
      await lockDocument(tx, documentId);
      const { count } = await tx.ismsDocumentControlLink.createMany({
        data: uniqueControlIds.map((controlId) => ({
          ismsDocumentId: documentId,
          controlId,
        })),
        skipDuplicates: true,
      });
      if (count > 0) {
        await invalidateApprovalIfNeeded({ tx, documentId });
      }
    });
    return { message: 'Controls linked' };
  }

  async removeControl({
    documentId,
    organizationId,
    controlId,
  }: {
    documentId: string;
    organizationId: string;
    controlId: string;
  }) {
    await this.requireDocument({ documentId, organizationId });
    // Only a real unlink (a row actually deleted) invalidates sign-off; removing
    // a control that wasn't linked must not downgrade an approved document.
    await db.$transaction(async (tx) => {
      // Lock before the delete so the mutation serializes against approve()
      // (same lock); invalidate only on a real unlink, re-taking the lock no-ops.
      await lockDocument(tx, documentId);
      const { count } = await tx.ismsDocumentControlLink.deleteMany({
        where: { ismsDocumentId: documentId, controlId },
      });
      if (count > 0) {
        await invalidateApprovalIfNeeded({ tx, documentId });
      }
    });
    return { message: 'Control unlinked' };
  }

  private async requireDocument({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
      select: { id: true },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }
    return document;
  }
}
