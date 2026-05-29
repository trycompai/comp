import { Injectable, NotFoundException } from '@nestjs/common';
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
    const position =
      dto.position ??
      (await db.ismsInterestedPartyRequirement.count({
        where: { documentId },
      }));

    return db.ismsInterestedPartyRequirement.create({
      data: {
        documentId,
        interestedPartyId: dto.interestedPartyId ?? null,
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
    await this.requireRequirement({ requirementId, organizationId });

    return db.ismsInterestedPartyRequirement.update({
      where: { id: requirementId },
      data: {
        interestedPartyId: dto.interestedPartyId ?? undefined,
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
