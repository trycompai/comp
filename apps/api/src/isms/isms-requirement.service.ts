import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

/**
 * CRUD for the Interested Parties Requirements & ISMS Treatment register (clauses
 * 4.2b/c). Derived rows are written by IsmsContextService.generate; this service
 * handles manual edits. Editing a derived row flips its source to 'manual'.
 */
@Injectable()
export class IsmsRequirementService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateRequirementDto;
  }) {
    await this.requireDocument({ documentId, organizationId });
    // Treat empty/whitespace as "no link" so a blank id can't skip validation
    // or be persisted as an invalid reference.
    const interestedPartyId = dto.interestedPartyId?.trim() || null;
    if (interestedPartyId) {
      await this.requirePartyInDocument({ interestedPartyId, documentId });
    }
    const position = dto.position ?? (await this.nextPosition({ documentId }));

    return db.ismsInterestedPartyRequirement.create({
      data: {
        documentId,
        interestedPartyId,
        partyName: dto.partyName,
        requirement: dto.requirement,
        treatment: dto.treatment,
        source: 'manual',
        position,
      },
    });
  }

  async update({
    requirementId,
    organizationId,
    dto,
  }: {
    requirementId: string;
    organizationId: string;
    dto: UpdateRequirementDto;
  }) {
    const requirement = await this.requireRequirement({
      requirementId,
      organizationId,
    });
    // undefined = field omitted (leave as-is); empty string = clear the link.
    const partyFieldProvided = dto.interestedPartyId !== undefined;
    const interestedPartyId = dto.interestedPartyId?.trim() || null;
    if (interestedPartyId) {
      await this.requirePartyInDocument({
        interestedPartyId,
        documentId: requirement.documentId,
      });
    }

    return db.ismsInterestedPartyRequirement.update({
      where: { id: requirementId },
      data: {
        interestedPartyId: partyFieldProvided ? interestedPartyId : undefined,
        partyName: dto.partyName ?? undefined,
        requirement: dto.requirement ?? undefined,
        treatment: dto.treatment ?? undefined,
        position: dto.position ?? undefined,
        source: 'manual',
      },
    });
  }

  async remove({
    requirementId,
    organizationId,
  }: {
    requirementId: string;
    organizationId: string;
  }) {
    await this.requireRequirement({ requirementId, organizationId });
    await db.ismsInterestedPartyRequirement.delete({
      where: { id: requirementId },
    });
    return { success: true };
  }

  /** Next position uses max(position)+1 so it survives deletes (no collisions). */
  private async nextPosition({ documentId }: { documentId: string }) {
    const last = await db.ismsInterestedPartyRequirement.findFirst({
      where: { documentId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? -1) + 1;
  }

  /** Ensures a linked interested party belongs to the same document (and org). */
  private async requirePartyInDocument({
    interestedPartyId,
    documentId,
  }: {
    interestedPartyId: string;
    documentId: string;
  }) {
    const party = await db.ismsInterestedParty.findFirst({
      where: { id: interestedPartyId, documentId },
      select: { id: true },
    });
    if (!party) {
      throw new BadRequestException(
        'Interested party does not belong to this document',
      );
    }
    return party;
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

  private async requireRequirement({
    requirementId,
    organizationId,
  }: {
    requirementId: string;
    organizationId: string;
  }) {
    const requirement = await db.ismsInterestedPartyRequirement.findFirst({
      where: { id: requirementId, document: { organizationId } },
    });
    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }
    return requirement;
  }
}
