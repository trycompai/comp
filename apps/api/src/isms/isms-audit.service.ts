import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { seedAuditControlsIfMissing } from './documents/internal-audit';
import {
  DEFAULT_AUDIT_CRITERIA,
  DEFAULT_AUDIT_SCOPE,
} from './documents/internal-audit-defaults';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';
import { parseOptionalDate } from './utils/parse-optional-date';
import type {
  CreateAuditInput,
  UpdateAuditInput,
} from './registers/register-registry';

/**
 * CRUD for the Internal Audit instances register (clause 9.2, CS-724). Every
 * audit is customer-created; scope and criteria pre-fill with the template
 * defaults, the reference is server-generated ("IA-YYYY-NN"), and the fifteen
 * default Controls Tested rows are seeded in the same transaction. Deleting an
 * audit cascades to its control rows and findings.
 */
@Injectable()
export class IsmsAuditService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateAuditInput;
  }) {
    await this.requireDocument({ documentId, organizationId });
    const plannedStartDate = parseOptionalDate(dto.plannedStartDate);
    const plannedEndDate = parseOptionalDate(dto.plannedEndDate);
    this.assertDateOrder({
      start: plannedStartDate ?? null,
      end: plannedEndDate ?? null,
    });

    return db.$transaction(async (tx) => {
      // The lock also serializes reference generation, so concurrent creates
      // can never both compute the same next "IA-YYYY-NN".
      await lockDocument(tx, documentId);
      const position =
        dto.position ?? (await this.nextPosition({ tx, documentId }));
      await invalidateApprovalIfNeeded({ tx, documentId });
      const audit = await tx.ismsAudit.create({
        data: {
          documentId,
          reference: await this.nextReference({ tx, documentId }),
          scope: dto.scope?.trim() || DEFAULT_AUDIT_SCOPE,
          criteria: dto.criteria?.trim() || DEFAULT_AUDIT_CRITERIA,
          auditorName: dto.auditorName?.trim() || null,
          plannedStartDate: plannedStartDate ?? null,
          plannedEndDate: plannedEndDate ?? null,
          position,
        },
      });
      // The default sample set the customer sees when they first open the audit.
      await seedAuditControlsIfMissing({ tx, auditId: audit.id, documentId });
      return audit;
    });
  }

  async update({
    auditId,
    organizationId,
    dto,
  }: {
    auditId: string;
    organizationId: string;
    dto: UpdateAuditInput;
  }) {
    const audit = await this.requireAudit({ auditId, organizationId });
    const plannedStartDate = parseOptionalDate(dto.plannedStartDate);
    const plannedEndDate = parseOptionalDate(dto.plannedEndDate);
    // Validate the EFFECTIVE schedule: a field omitted from this update keeps
    // its stored value, so the check merges dto values over the existing row.
    this.assertDateOrder({
      start:
        plannedStartDate === undefined
          ? audit.plannedStartDate
          : plannedStartDate,
      end: plannedEndDate === undefined ? audit.plannedEndDate : plannedEndDate,
    });

    return db.$transaction(async (tx) => {
      // Same per-document lock submit/approve take, so an edit can't race the
      // submission's completeness check.
      await lockDocument(tx, audit.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: audit.documentId });
      return tx.ismsAudit.update({
        where: { id: auditId },
        data: {
          scope: dto.scope ?? undefined,
          criteria: dto.criteria ?? undefined,
          auditorName:
            dto.auditorName === undefined
              ? undefined
              : dto.auditorName?.trim() || null,
          plannedStartDate,
          plannedEndDate,
          status: dto.status ?? undefined,
          conclusionVerdict:
            dto.conclusionVerdict === undefined
              ? undefined
              : dto.conclusionVerdict,
          conclusionNotes:
            dto.conclusionNotes === undefined
              ? undefined
              : dto.conclusionNotes?.trim() || null,
          signoffAuditorName: this.optionalText(dto.signoffAuditorName),
          signoffAuditorDate: parseOptionalDate(dto.signoffAuditorDate),
          signoffSpoName: this.optionalText(dto.signoffSpoName),
          signoffSpoDate: parseOptionalDate(dto.signoffSpoDate),
          signoffTopMgmtName: this.optionalText(dto.signoffTopMgmtName),
          signoffTopMgmtDate: parseOptionalDate(dto.signoffTopMgmtDate),
          position: dto.position ?? undefined,
        },
      });
    });
  }

  async remove({
    auditId,
    organizationId,
  }: {
    auditId: string;
    organizationId: string;
  }) {
    const audit = await this.requireAudit({ auditId, organizationId });
    await db.$transaction(async (tx) => {
      await lockDocument(tx, audit.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: audit.documentId });
      // Cascades to the audit's control rows and findings.
      await tx.ismsAudit.delete({ where: { id: auditId } });
    });
    return { success: true };
  }

  /** Three-state text field: undefined = leave, null/empty = clear. */
  private optionalText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    return value?.trim() || null;
  }

  /** A planned schedule must not end before it starts (client gate mirrored). */
  private assertDateOrder({
    start,
    end,
  }: {
    start: Date | null;
    end: Date | null;
  }): void {
    if (start && end && end.getTime() < start.getTime()) {
      throw new BadRequestException(
        'Planned end date must be on or after the planned start date',
      );
    }
  }

  /**
   * Next "IA-YYYY-NN" for the document: the year of creation plus a two-digit
   * per-document, per-year sequence. Max + 1 over the surviving rows, so
   * deleting an older audit never reissues its number (deleting the newest
   * audit frees its number — acceptable, since audits are freely deletable
   * drafts until published). Runs under the per-document lock.
   */
  private async nextReference({
    tx,
    documentId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
  }): Promise<string> {
    const year = new Date().getUTCFullYear();
    const prefix = `IA-${year}-`;
    const existing = await tx.ismsAudit.findMany({
      where: { documentId, reference: { startsWith: prefix } },
      select: { reference: true },
    });
    const maxSequence = existing.reduce((max, audit) => {
      const sequence = Number.parseInt(
        audit.reference.slice(prefix.length),
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
    const last = await tx.ismsAudit.findFirst({
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
    // Scope to the Internal Audit document type: audit rows must never attach
    // to another ISMS document (they'd be invisible to the Clause 9.2 export).
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId, type: 'internal_audit' },
    });
    if (!document) {
      throw new NotFoundException('ISMS internal audit document not found');
    }
    return document;
  }

  private async requireAudit({
    auditId,
    organizationId,
  }: {
    auditId: string;
    organizationId: string;
  }) {
    // Type-scoped like create: an audit row can only ever live on THIS org's
    // Internal Audit document (belt-and-braces with the creation guard).
    const audit = await db.ismsAudit.findFirst({
      where: {
        id: auditId,
        document: { organizationId, type: 'internal_audit' },
      },
    });
    if (!audit) {
      throw new NotFoundException('Audit not found');
    }
    return audit;
  }
}
