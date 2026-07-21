import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';
import type {
  CreateAuditControlInput,
  UpdateAuditControlInput,
} from './registers/register-registry';

/**
 * CRUD for an audit's Controls Tested rows (clause 9.2, CS-724). The fifteen
 * default rows are created idempotently by seedAuditControlsIfMissing when the
 * audit is created; this service handles customer-added rows and edits. The
 * ticket allows adding, editing, and removing rows freely — seeded rows are
 * deletable too (nothing re-seeds an existing audit, so they stay removed).
 * Editing flips source to 'manual' (records the override).
 */
@Injectable()
export class IsmsAuditControlService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateAuditControlInput;
  }) {
    const audit = await this.requireAudit({
      auditId: dto.auditId,
      documentId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      await lockDocument(tx, audit.documentId);
      const position =
        dto.position ?? (await this.nextPosition({ tx, auditId: audit.id }));
      await invalidateApprovalIfNeeded({ tx, documentId: audit.documentId });
      return tx.ismsAuditControl.create({
        data: {
          auditId: audit.id,
          documentId: audit.documentId,
          controlKey: null, // customer-added row
          controlRef: dto.controlRef,
          whatWasTested: dto.whatWasTested ?? '',
          whereToFind: dto.whereToFind ?? '',
          result: dto.result ?? null,
          notes: dto.notes?.trim() || null,
          source: 'manual',
          position,
        },
      });
    });
  }

  async update({
    controlId,
    organizationId,
    dto,
  }: {
    controlId: string;
    organizationId: string;
    dto: UpdateAuditControlInput;
  }) {
    const control = await this.requireControl({ controlId, organizationId });

    return db.$transaction(async (tx) => {
      // Same per-document lock submit/approve take, so an edit can't race the
      // submission's completeness check.
      await lockDocument(tx, control.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: control.documentId });
      return tx.ismsAuditControl.update({
        where: { id: controlId },
        data: {
          controlRef: dto.controlRef ?? undefined,
          whatWasTested: dto.whatWasTested ?? undefined,
          whereToFind: dto.whereToFind ?? undefined,
          result: dto.result === undefined ? undefined : dto.result,
          notes:
            dto.notes === undefined ? undefined : dto.notes?.trim() || null,
          position: dto.position ?? undefined,
          source: 'manual',
        },
      });
    });
  }

  async remove({
    controlId,
    organizationId,
  }: {
    controlId: string;
    organizationId: string;
  }) {
    const control = await this.requireControl({ controlId, organizationId });
    await db.$transaction(async (tx) => {
      await lockDocument(tx, control.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: control.documentId });
      // Findings linked to this row survive: the FK is SET NULL and each
      // finding keeps its own clauseOrControl text as the frozen label.
      await tx.ismsAuditControl.delete({ where: { id: controlId } });
    });
    return { success: true };
  }

  private async nextPosition({
    tx,
    auditId,
  }: {
    tx: Prisma.TransactionClient;
    auditId: string;
  }) {
    const last = await tx.ismsAuditControl.findFirst({
      where: { auditId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? -1) + 1;
  }

  private async requireAudit({
    auditId,
    documentId,
    organizationId,
  }: {
    auditId: string;
    documentId: string;
    organizationId: string;
  }) {
    // The audit must belong to THIS org's Internal Audit document (and to the
    // document in the URL, so a row can't be attached across documents).
    const audit = await db.ismsAudit.findFirst({
      where: {
        id: auditId,
        documentId,
        document: { organizationId, type: 'internal_audit' },
      },
    });
    if (!audit) {
      throw new NotFoundException('Audit not found');
    }
    return audit;
  }

  private async requireControl({
    controlId,
    organizationId,
  }: {
    controlId: string;
    organizationId: string;
  }) {
    const control = await db.ismsAuditControl.findFirst({
      where: { id: controlId, audit: { document: { organizationId } } },
    });
    if (!control) {
      throw new NotFoundException('Audit control row not found');
    }
    return control;
  }
}
