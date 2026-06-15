import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocumentForPositions } from './utils/document-lock';
import type {
  CreateInterestedPartyInput,
  UpdateInterestedPartyInput,
} from './registers/register-registry';

/**
 * CRUD for the Interested Parties register (clause 4.2a). Derived rows are written
 * by IsmsContextService.generate; this service handles manual edits and overrides.
 * Editing a derived row flips its source to 'manual' so the override survives
 * regeneration.
 */
@Injectable()
export class IsmsInterestedPartyService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateInterestedPartyInput;
  }) {
    await this.requireDocument({ documentId, organizationId });

    return db.$transaction(async (tx) => {
      await lockDocumentForPositions(tx, documentId);
      const position =
        dto.position ?? (await this.nextPosition({ tx, documentId }));
      await invalidateApprovalIfNeeded({ tx, documentId });
      return tx.ismsInterestedParty.create({
        data: {
          documentId,
          name: dto.name,
          category: dto.category,
          needsExpectations: dto.needsExpectations,
          source: 'manual',
          position,
        },
      });
    });
  }

  async update({
    partyId,
    organizationId,
    dto,
  }: {
    partyId: string;
    organizationId: string;
    dto: UpdateInterestedPartyInput;
  }) {
    const party = await this.requireParty({ partyId, organizationId });

    return db.$transaction(async (tx) => {
      await invalidateApprovalIfNeeded({ tx, documentId: party.documentId });
      return tx.ismsInterestedParty.update({
        where: { id: partyId },
        data: {
          name: dto.name ?? undefined,
          category: dto.category ?? undefined,
          needsExpectations: dto.needsExpectations ?? undefined,
          position: dto.position ?? undefined,
          source: 'manual',
        },
      });
    });
  }

  async remove({
    partyId,
    organizationId,
  }: {
    partyId: string;
    organizationId: string;
  }) {
    const party = await this.requireParty({ partyId, organizationId });
    await db.$transaction(async (tx) => {
      await invalidateApprovalIfNeeded({ tx, documentId: party.documentId });
      await tx.ismsInterestedParty.delete({ where: { id: partyId } });
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
    const last = await tx.ismsInterestedParty.findFirst({
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

  private async requireParty({
    partyId,
    organizationId,
  }: {
    partyId: string;
    organizationId: string;
  }) {
    const party = await db.ismsInterestedParty.findFirst({
      where: { id: partyId, document: { organizationId } },
    });
    if (!party) {
      throw new NotFoundException('Interested party not found');
    }
    return party;
  }
}
