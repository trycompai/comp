import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { invalidateApprovalIfNeeded } from './utils/approval';
import type {
  CreateObjectiveInput,
  UpdateObjectiveInput,
} from './registers/register-registry';

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
    dto: CreateObjectiveInput;
  }) {
    await this.requireDocument({ documentId, organizationId });
    const ownerMemberId = await this.resolveOwner({
      ownerMemberId: dto.ownerMemberId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      const position =
        dto.position ?? (await this.nextPosition({ tx, documentId }));
      await invalidateApprovalIfNeeded({ tx, documentId });
      return tx.ismsObjective.create({
        data: {
          documentId,
          objective: dto.objective,
          target: dto.target ?? null,
          ownerMemberId: ownerMemberId ?? null,
          cadence: dto.cadence ?? null,
          plan: dto.plan ?? null,
          measurementMethod: dto.measurementMethod ?? null,
          status: dto.status ?? 'not_started',
          source: 'manual',
          position,
        },
      });
    });
  }

  async update({
    objectiveId,
    organizationId,
    dto,
  }: {
    objectiveId: string;
    organizationId: string;
    dto: UpdateObjectiveInput;
  }) {
    const objective = await this.requireObjective({
      objectiveId,
      organizationId,
    });
    // undefined = field omitted (leave as-is); empty string = clear the owner.
    const ownerFieldProvided = dto.ownerMemberId !== undefined;
    const ownerMemberId = await this.resolveOwner({
      ownerMemberId: dto.ownerMemberId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      await invalidateApprovalIfNeeded({
        tx,
        documentId: objective.documentId,
      });
      return tx.ismsObjective.update({
        where: { id: objectiveId },
        data: {
          objective: dto.objective ?? undefined,
          target: dto.target ?? undefined,
          ownerMemberId: ownerFieldProvided ? ownerMemberId : undefined,
          cadence: dto.cadence ?? undefined,
          plan: dto.plan ?? undefined,
          measurementMethod: dto.measurementMethod ?? undefined,
          status: dto.status ?? undefined,
          position: dto.position ?? undefined,
          source: 'manual',
        },
      });
    });
  }

  async remove({
    objectiveId,
    organizationId,
  }: {
    objectiveId: string;
    organizationId: string;
  }) {
    const objective = await this.requireObjective({
      objectiveId,
      organizationId,
    });
    await db.$transaction(async (tx) => {
      await invalidateApprovalIfNeeded({
        tx,
        documentId: objective.documentId,
      });
      await tx.ismsObjective.delete({ where: { id: objectiveId } });
    });
    return { success: true };
  }

  /**
   * Next position uses max(position)+1 so it survives deletes (no collisions).
   * Runs on the transaction client so the max-position read and the create are
   * atomic — otherwise concurrent creates can compute the same position.
   */
  private async nextPosition({
    tx,
    documentId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
  }) {
    const last = await tx.ismsObjective.findFirst({
      where: { documentId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? -1) + 1;
  }

  /**
   * Resolve an objective owner. `undefined` (field omitted) is passed through so
   * the caller can leave it untouched; an empty/whitespace value clears it; a
   * non-empty id must resolve to a member of the document's organization (mirrors
   * submitForApproval's approver check).
   */
  private async resolveOwner({
    ownerMemberId,
    organizationId,
  }: {
    ownerMemberId: string | undefined;
    organizationId: string;
  }): Promise<string | null | undefined> {
    if (ownerMemberId === undefined) {
      return undefined;
    }
    const trimmed = ownerMemberId.trim();
    if (!trimmed) {
      return null;
    }
    const member = await db.member.findFirst({
      where: { id: trimmed, organizationId },
    });
    if (!member) {
      throw new NotFoundException('Owner not found in organization');
    }
    return trimmed;
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
