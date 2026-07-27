import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';
import type {
  CreateMetricInput,
  UpdateMetricInput,
} from './registers/register-registry';

/**
 * CRUD for the ISMS Monitoring metrics register (clause 9.1, CS-723). The nine
 * seeded metrics are created idempotently by seedMetricsIfMissing; this service
 * handles custom-metric creation and edits to any metric's framework fields.
 * Editing flips source to 'manual' (records the override). Seeded metrics
 * cannot be hard-deleted — deactivating (isActive=false) is the honest
 * "remove": history is kept and the seed never resurrects the row.
 */
@Injectable()
export class IsmsMetricService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateMetricInput;
  }) {
    await this.requireDocument({ documentId, organizationId });
    const monitorMemberId = await this.resolveMember({
      memberId: dto.monitorMemberId,
      organizationId,
    });
    const analyzeMemberId = await this.resolveMember({
      memberId: dto.analyzeMemberId,
      organizationId,
    });
    const objectiveId = await this.resolveObjective({
      objectiveId: dto.objectiveId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      await lockDocument(tx, documentId);
      const position =
        dto.position ?? (await this.nextPosition({ tx, documentId }));
      await invalidateApprovalIfNeeded({ tx, documentId });
      return tx.ismsMetric.create({
        data: {
          documentId,
          metricKey: null, // customer-added custom metric
          name: dto.name,
          whatIsMeasured: dto.whatIsMeasured ?? '',
          method: dto.method ?? '',
          cadence: dto.cadence ?? null,
          monitorMemberId: monitorMemberId ?? null,
          analyzeMemberId: analyzeMemberId ?? null,
          target: dto.target ?? null,
          objectiveId: objectiveId ?? null,
          isActive: dto.isActive ?? true,
          source: 'manual',
          position,
        },
      });
    });
  }

  async update({
    metricId,
    organizationId,
    dto,
  }: {
    metricId: string;
    organizationId: string;
    dto: UpdateMetricInput;
  }) {
    const metric = await this.requireMetric({ metricId, organizationId });
    const monitorMemberId = await this.resolveMember({
      memberId: dto.monitorMemberId,
      organizationId,
    });
    const analyzeMemberId = await this.resolveMember({
      memberId: dto.analyzeMemberId,
      organizationId,
    });
    const objectiveId = await this.resolveObjective({
      objectiveId: dto.objectiveId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      // Same per-document lock submit/approve take, so an edit can't race the
      // submission's completeness check.
      await lockDocument(tx, metric.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: metric.documentId });
      return tx.ismsMetric.update({
        where: { id: metricId },
        data: {
          name: dto.name ?? undefined,
          whatIsMeasured: dto.whatIsMeasured ?? undefined,
          method: dto.method ?? undefined,
          cadence: dto.cadence === undefined ? undefined : dto.cadence,
          monitorMemberId:
            dto.monitorMemberId === undefined ? undefined : monitorMemberId,
          analyzeMemberId:
            dto.analyzeMemberId === undefined ? undefined : analyzeMemberId,
          target: dto.target === undefined ? undefined : dto.target,
          objectiveId: dto.objectiveId === undefined ? undefined : objectiveId,
          isActive: dto.isActive ?? undefined,
          position: dto.position ?? undefined,
          source: 'manual',
        },
      });
    });
  }

  async remove({
    metricId,
    organizationId,
  }: {
    metricId: string;
    organizationId: string;
  }) {
    const metric = await this.requireMetric({ metricId, organizationId });
    if (metric.metricKey) {
      throw new BadRequestException(
        'Seeded metrics cannot be removed; deactivate them instead.',
      );
    }
    await db.$transaction(async (tx) => {
      await lockDocument(tx, metric.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: metric.documentId });
      // Cascades to the metric's measurements.
      await tx.ismsMetric.delete({ where: { id: metricId } });
    });
    return { success: true };
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
    // Who-monitors / who-analyses must be active People members.
    const member = await db.member.findFirst({
      where: { id: trimmed, organizationId, deactivated: false },
    });
    if (!member) {
      throw new NotFoundException('Active member not found in organization');
    }
    return trimmed;
  }

  private async resolveObjective({
    objectiveId,
    organizationId,
  }: {
    objectiveId: string | null | undefined;
    organizationId: string;
  }): Promise<string | null | undefined> {
    if (objectiveId === undefined) return undefined;
    const trimmed = objectiveId?.trim();
    if (!trimmed) return null;
    // Target links must point at an objective in THIS org's Objectives Plan.
    const objective = await db.ismsObjective.findFirst({
      where: { id: trimmed, document: { organizationId } },
    });
    if (!objective) {
      throw new NotFoundException('Objective not found in organization');
    }
    return trimmed;
  }

  private async nextPosition({
    tx,
    documentId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
  }) {
    const last = await tx.ismsMetric.findFirst({
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
    // Scope to the Monitoring document type: metric rows must never attach to
    // another ISMS document (they'd be invisible to the Clause 9.1 export).
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId, type: 'monitoring' },
    });
    if (!document) {
      throw new NotFoundException('ISMS monitoring document not found');
    }
    return document;
  }

  private async requireMetric({
    metricId,
    organizationId,
  }: {
    metricId: string;
    organizationId: string;
  }) {
    const metric = await db.ismsMetric.findFirst({
      where: { id: metricId, document: { organizationId } },
    });
    if (!metric) {
      throw new NotFoundException('Metric not found');
    }
    return metric;
  }
}
