import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { CreateInterestedPartyDto } from './dto/create-interested-party.dto';
import { UpdateInterestedPartyDto } from './dto/update-interested-party.dto';

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
    dto: CreateInterestedPartyDto;
  }) {
    await this.requireDocument({ documentId, organizationId });
    const position =
      dto.position ??
      (await db.ismsInterestedParty.count({ where: { documentId } }));

    return db.ismsInterestedParty.create({
      data: {
        documentId,
        name: dto.name,
        category: dto.category,
        needsExpectations: dto.needsExpectations,
        source: 'manual',
        position,
      },
    });
  }

  async update({
    partyId,
    organizationId,
    dto,
  }: {
    partyId: string;
    organizationId: string;
    dto: UpdateInterestedPartyDto;
  }) {
    await this.requireParty({ partyId, organizationId });

    return db.ismsInterestedParty.update({
      where: { id: partyId },
      data: {
        name: dto.name ?? undefined,
        category: dto.category ?? undefined,
        needsExpectations: dto.needsExpectations ?? undefined,
        position: dto.position ?? undefined,
        source: 'manual',
      },
    });
  }

  async remove({
    partyId,
    organizationId,
  }: {
    partyId: string;
    organizationId: string;
  }) {
    await this.requireParty({ partyId, organizationId });
    await db.ismsInterestedParty.delete({ where: { id: partyId } });
    return { success: true };
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
