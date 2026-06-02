import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { CreateObjectiveDto } from './dto/create-objective.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';

/**
 * CRUD for the Information Security Objectives register (clause 6.2). Derived rows
 * are written by IsmsContextService.generate; this service handles manual edits and
 * status/owner updates. Editing a derived row flips its source to 'manual'.
 */
@Injectable()
export class IsmsObjectiveService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateObjectiveDto;
  }) {
    await this.requireDocument({ documentId, organizationId });
    const position = dto.position ?? (await this.nextPosition({ documentId }));

    return db.ismsObjective.create({
      data: {
        documentId,
        objective: dto.objective,
        target: dto.target ?? null,
        ownerMemberId: dto.ownerMemberId ?? null,
        cadence: dto.cadence ?? null,
        plan: dto.plan ?? null,
        measurementMethod: dto.measurementMethod ?? null,
        status: dto.status ?? 'not_started',
        source: 'manual',
        position,
      },
    });
  }

  async update({
    objectiveId,
    organizationId,
    dto,
  }: {
    objectiveId: string;
    organizationId: string;
    dto: UpdateObjectiveDto;
  }) {
    await this.requireObjective({ objectiveId, organizationId });

    return db.ismsObjective.update({
      where: { id: objectiveId },
      data: {
        objective: dto.objective ?? undefined,
        target: dto.target ?? undefined,
        ownerMemberId: dto.ownerMemberId ?? undefined,
        cadence: dto.cadence ?? undefined,
        plan: dto.plan ?? undefined,
        measurementMethod: dto.measurementMethod ?? undefined,
        status: dto.status ?? undefined,
        position: dto.position ?? undefined,
        source: 'manual',
      },
    });
  }

  async remove({
    objectiveId,
    organizationId,
  }: {
    objectiveId: string;
    organizationId: string;
  }) {
    await this.requireObjective({ objectiveId, organizationId });
    await db.ismsObjective.delete({ where: { id: objectiveId } });
    return { success: true };
  }

  /** Next position uses max(position)+1 so it survives deletes (no collisions). */
  private async nextPosition({ documentId }: { documentId: string }) {
    const last = await db.ismsObjective.findFirst({
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

  private async requireObjective({
    objectiveId,
    organizationId,
  }: {
    objectiveId: string;
    organizationId: string;
  }) {
    const objective = await db.ismsObjective.findFirst({
      where: { id: objectiveId, document: { organizationId } },
    });
    if (!objective) {
      throw new NotFoundException('Objective not found');
    }
    return objective;
  }
}
