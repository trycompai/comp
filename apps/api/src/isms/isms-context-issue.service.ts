import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocumentForPositions } from './utils/document-lock';
import type {
  CreateContextIssueInput,
  UpdateContextIssueInput,
} from './registers/register-registry';

/**
 * CRUD for the Context-of-the-Organization (clause 4.1) issue register. Derived
 * rows are written by IsmsService.generate; this service handles manual edits and
 * overrides. Editing a derived row flips its source to 'manual' so the override is
 * preserved across regeneration.
 */
@Injectable()
export class IsmsContextIssueService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateContextIssueInput;
  }) {
    await this.requireDocument({ documentId, organizationId });

    return db.$transaction(async (tx) => {
      await lockDocumentForPositions(tx, documentId);
      const position =
        dto.position ?? (await this.nextPosition({ tx, documentId }));
      await invalidateApprovalIfNeeded({ tx, documentId });
      return tx.ismsContextIssue.create({
        data: {
          documentId,
          kind: dto.kind,
          category: dto.category ?? null,
          description: dto.description,
          effect: dto.effect,
          source: 'manual',
          position,
        },
      });
    });
  }

  async update({
    issueId,
    organizationId,
    dto,
  }: {
    issueId: string;
    organizationId: string;
    dto: UpdateContextIssueInput;
  }) {
    const issue = await this.requireIssue({ issueId, organizationId });

    return db.$transaction(async (tx) => {
      await invalidateApprovalIfNeeded({ tx, documentId: issue.documentId });
      return tx.ismsContextIssue.update({
        where: { id: issueId },
        data: {
          kind: dto.kind ?? undefined,
          category: dto.category ?? undefined,
          description: dto.description ?? undefined,
          effect: dto.effect ?? undefined,
          position: dto.position ?? undefined,
          // Editing a derived row records the override by flipping it to manual.
          source: 'manual',
        },
      });
    });
  }

  async remove({
    issueId,
    organizationId,
  }: {
    issueId: string;
    organizationId: string;
  }) {
    const issue = await this.requireIssue({ issueId, organizationId });
    await db.$transaction(async (tx) => {
      await invalidateApprovalIfNeeded({ tx, documentId: issue.documentId });
      await tx.ismsContextIssue.delete({ where: { id: issueId } });
    });
    return { success: true };
  }

  /**
   * Next position uses max(position)+1 so it survives deletes. Runs on the
   * transaction client; the create first takes a per-document advisory lock
   * (lockDocumentForPositions) so concurrent creates can't read the same max.
   */
  private async nextPosition({
    tx,
    documentId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
  }) {
    const last = await tx.ismsContextIssue.findFirst({
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
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }
    return document;
  }

  private async requireIssue({
    issueId,
    organizationId,
  }: {
    issueId: string;
    organizationId: string;
  }) {
    const issue = await db.ismsContextIssue.findFirst({
      where: { id: issueId, document: { organizationId } },
    });
    if (!issue) {
      throw new NotFoundException('Context issue not found');
    }
    return issue;
  }
}
