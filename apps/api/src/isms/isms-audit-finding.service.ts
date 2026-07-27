import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';
import { parseOptionalDate } from './utils/parse-optional-date';
import type {
  CreateAuditFindingInput,
  UpdateAuditFindingInput,
} from './registers/register-registry';

/**
 * CRUD for an audit's findings (clause 9.2, CS-724). Most findings are raised
 * from a Controls Tested row (non-conformity / observation) and link back to
 * it; standalone findings are also allowed. The reference is server-generated
 * ("F-NN", per-audit sequence) and immutable.
 */
@Injectable()
export class IsmsAuditFindingService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateAuditFindingInput;
  }) {
    const audit = await this.requireAudit({
      auditId: dto.auditId,
      documentId,
      organizationId,
    });
    const control = await this.resolveControl({
      controlId: dto.controlId,
      auditId: audit.id,
    });
    const ownerMemberId = await this.resolveMember({
      memberId: dto.ownerMemberId,
      organizationId,
    });
    const dueDate = parseOptionalDate(dto.dueDate);

    return db.$transaction(async (tx) => {
      // The lock also serializes reference generation, so concurrent creates
      // can never both compute the same next "F-NN".
      await lockDocument(tx, audit.documentId);
      const position =
        dto.position ?? (await this.nextPosition({ tx, auditId: audit.id }));
      await invalidateApprovalIfNeeded({ tx, documentId: audit.documentId });
      return tx.ismsAuditFinding.create({
        data: {
          auditId: audit.id,
          documentId: audit.documentId,
          reference: await this.nextReference({ tx, auditId: audit.id }),
          type: dto.type,
          controlId: control?.id ?? null,
          // A linked finding without its own clause text inherits the row's
          // reference, so unlinking (or deleting the row) never leaves the
          // finding unlabelled in the generated document.
          clauseOrControl:
            dto.clauseOrControl?.trim() || control?.controlRef || null,
          description: dto.description,
          ownerMemberId: ownerMemberId ?? null,
          dueDate: dueDate ?? null,
          status: dto.status ?? 'open',
          closureEvidence: dto.closureEvidence?.trim() || null,
          position,
        },
      });
    });
  }

  async update({
    findingId,
    organizationId,
    dto,
  }: {
    findingId: string;
    organizationId: string;
    dto: UpdateAuditFindingInput;
  }) {
    const finding = await this.requireFinding({ findingId, organizationId });
    const control = await this.resolveControl({
      controlId: dto.controlId,
      auditId: finding.auditId,
    });
    // Same inheritance on link change: when this update links a control and
    // the finding's effective clause text is empty, derive it from the row.
    const requestedClause =
      dto.clauseOrControl === undefined
        ? finding.clauseOrControl
        : dto.clauseOrControl?.trim() || null;
    const derivedClause = requestedClause ?? control?.controlRef ?? null;
    const ownerMemberId = await this.resolveMember({
      memberId: dto.ownerMemberId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      // Same per-document lock submit/approve take, so an edit can't race the
      // submission's completeness check.
      await lockDocument(tx, finding.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: finding.documentId });
      return tx.ismsAuditFinding.update({
        where: { id: findingId },
        data: {
          type: dto.type ?? undefined,
          controlId: dto.controlId === undefined ? undefined : (control?.id ?? null),
          clauseOrControl:
            dto.clauseOrControl === undefined && control === undefined
              ? undefined
              : derivedClause,
          description: dto.description ?? undefined,
          ownerMemberId:
            dto.ownerMemberId === undefined ? undefined : ownerMemberId,
          dueDate: parseOptionalDate(dto.dueDate),
          status: dto.status ?? undefined,
          closureEvidence:
            dto.closureEvidence === undefined
              ? undefined
              : dto.closureEvidence?.trim() || null,
          position: dto.position ?? undefined,
        },
      });
    });
  }

  async remove({
    findingId,
    organizationId,
  }: {
    findingId: string;
    organizationId: string;
  }) {
    const finding = await this.requireFinding({ findingId, organizationId });
    await db.$transaction(async (tx) => {
      await lockDocument(tx, finding.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: finding.documentId });
      await tx.ismsAuditFinding.delete({ where: { id: findingId } });
    });
    return { success: true };
  }

  /**
   * Next "F-NN" for the audit: max + 1 over the surviving rows, so deleting an
   * older finding never reissues its number (deleting the newest frees it —
   * acceptable: findings are draft rows until published, and every published
   * version freezes its own findings in the version contentSnapshot).
   */
  private async nextReference({
    tx,
    auditId,
  }: {
    tx: Prisma.TransactionClient;
    auditId: string;
  }): Promise<string> {
    const existing = await tx.ismsAuditFinding.findMany({
      where: { auditId },
      select: { reference: true },
    });
    const maxSequence = existing.reduce((max, finding) => {
      const match = /^F-(\d+)$/.exec(finding.reference);
      return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
    }, 0);
    return `F-${String(maxSequence + 1).padStart(2, '0')}`;
  }

  /**
   * The linked Controls Tested row must belong to the SAME audit. Returns the
   * row (id + reference) so callers can inherit the clause label; undefined =
   * link untouched, null = explicitly unlinked.
   */
  private async resolveControl({
    controlId,
    auditId,
  }: {
    controlId: string | null | undefined;
    auditId: string;
  }): Promise<{ id: string; controlRef: string } | null | undefined> {
    if (controlId === undefined) return undefined;
    const trimmed = controlId?.trim();
    if (!trimmed) return null;
    const control = await db.ismsAuditControl.findFirst({
      where: { id: trimmed, auditId },
      select: { id: true, controlRef: true },
    });
    if (!control) {
      throw new NotFoundException('Audit control row not found in this audit');
    }
    return control;
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
    // Finding owners must be active People members.
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
    auditId,
  }: {
    tx: Prisma.TransactionClient;
    auditId: string;
  }) {
    const last = await tx.ismsAuditFinding.findFirst({
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

  private async requireFinding({
    findingId,
    organizationId,
  }: {
    findingId: string;
    organizationId: string;
  }) {
    const finding = await db.ismsAuditFinding.findFirst({
      where: {
        id: findingId,
        audit: { document: { organizationId, type: 'internal_audit' } },
      },
    });
    if (!finding) {
      throw new NotFoundException('Finding not found');
    }
    return finding;
  }
}
