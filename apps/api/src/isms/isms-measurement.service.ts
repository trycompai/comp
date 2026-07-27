import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { IsmsMetric } from '@db';
import { lockDocument } from './utils/document-lock';
import {
  isAlignedPeriodStart,
  periodStartFor,
  toPeriodKey,
  type MetricCadenceValue,
} from './utils/metric-periods';
import type {
  BulkCreateMeasurementInput,
  CreateMeasurementInput,
  UpdateMeasurementInput,
} from './registers/register-registry';

/**
 * Measurement history for the ISMS Monitoring register (clause 9.1, CS-723).
 * Measurements are timestamped records, never overwrites: `recordedAt` and
 * `enteredById` are server-set here and NEVER client-writable or updatable —
 * the guardrail that keeps backfill honest (a late entry for a historical
 * period visibly carries today's recording date).
 *
 * Recording a value deliberately does NOT invalidate document approval:
 * measurements are operational records, not framework changes. The published
 * version froze the values that were current at publish; monthly entry must
 * not revert the approved 9.1 framework document to draft. (Metric FIELD
 * edits, which change the framework, do invalidate — see IsmsMetricService.)
 */
@Injectable()
export class IsmsMeasurementService {
  async create({
    documentId,
    organizationId,
    memberId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    /** The caller's member id (session auth); null under API-key auth. */
    memberId?: string | null;
    dto: CreateMeasurementInput;
  }) {
    await this.requireDocument({ documentId, organizationId });
    const metric = await this.requireMetricInDocument({
      metricId: dto.metricId,
      documentId,
    });
    const periodKey = this.validatedPeriodKey({
      metric,
      periodStart: dto.periodStart,
    });

    return db.$transaction(async (tx) => {
      await lockDocument(tx, documentId);
      return tx.ismsMeasurement.create({
        data: this.rowData({
          metricId: metric.id,
          documentId,
          periodKey,
          value: dto.value,
          note: dto.note,
          memberId,
        }),
      });
    });
  }

  /**
   * One-save entry for the "Metrics due" and backfill views: every row is
   * validated up front and created in a single transaction, so a bad row
   * rejects the whole save instead of leaving a partial backfill.
   */
  async bulkCreate({
    documentId,
    organizationId,
    memberId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    memberId?: string | null;
    dto: BulkCreateMeasurementInput;
  }) {
    await this.requireDocument({ documentId, organizationId });

    const metricIds = [...new Set(dto.measurements.map((row) => row.metricId))];
    const metrics = await db.ismsMetric.findMany({
      where: { id: { in: metricIds }, documentId },
    });
    const metricsById = new Map(metrics.map((metric) => [metric.id, metric]));

    const rows = dto.measurements.map((row) => {
      const metric = metricsById.get(row.metricId);
      if (!metric) {
        throw new NotFoundException('Metric not found in document');
      }
      this.assertMetricActive(metric);
      return this.rowData({
        metricId: metric.id,
        documentId,
        periodKey: this.validatedPeriodKey({
          metric,
          periodStart: row.periodStart,
        }),
        value: row.value,
        note: row.note,
        memberId,
      });
    });

    return db.$transaction(async (tx) => {
      await lockDocument(tx, documentId);
      const created = await tx.ismsMeasurement.createMany({ data: rows });
      return { count: created.count };
    });
  }

  /**
   * Corrections may edit the value, note, or covered period — never
   * `recordedAt`, `enteredById`, or `source`.
   */
  async update({
    measurementId,
    organizationId,
    dto,
  }: {
    measurementId: string;
    organizationId: string;
    dto: UpdateMeasurementInput;
  }) {
    const measurement = await this.requireMeasurement({
      measurementId,
      organizationId,
    });

    let periodKey: string | undefined;
    if (dto.periodStart !== undefined) {
      const metric = await db.ismsMetric.findUniqueOrThrow({
        where: { id: measurement.metricId },
      });
      periodKey = this.validatedPeriodKey({
        metric,
        periodStart: dto.periodStart,
      });
    }

    return db.$transaction(async (tx) => {
      await lockDocument(tx, measurement.documentId);
      return tx.ismsMeasurement.update({
        where: { id: measurementId },
        data: {
          periodStart: periodKey ? new Date(`${periodKey}T00:00:00.000Z`) : undefined,
          value: dto.value === undefined ? undefined : dto.value.trim(),
          note: dto.note === undefined ? undefined : dto.note,
        },
      });
    });
  }

  async remove({
    measurementId,
    organizationId,
  }: {
    measurementId: string;
    organizationId: string;
  }) {
    const measurement = await this.requireMeasurement({
      measurementId,
      organizationId,
    });
    await db.$transaction(async (tx) => {
      await lockDocument(tx, measurement.documentId);
      await tx.ismsMeasurement.delete({ where: { id: measurementId } });
    });
    return { success: true };
  }

  /** Shared create payload: recordedAt/source come from the server, never the client. */
  private rowData({
    metricId,
    documentId,
    periodKey,
    value,
    note,
    memberId,
  }: {
    metricId: string;
    documentId: string;
    periodKey: string;
    value: string;
    note: string | null | undefined;
    memberId: string | null | undefined;
  }) {
    return {
      metricId,
      documentId,
      periodStart: new Date(`${periodKey}T00:00:00.000Z`),
      value: value.trim(),
      note: note?.trim() || null,
      enteredById: memberId ?? null,
      source: 'manual',
    };
  }

  private assertMetricActive(metric: IsmsMetric): void {
    if (!metric.isActive) {
      throw new BadRequestException(
        'This metric is deactivated; reactivate it to record measurements.',
      );
    }
  }

  /**
   * A measurement's period must be a first-of-period date aligned to the
   * metric's cadence, and must not be in the future. Requires a cadence —
   * without one there is no period grid to validate against.
   */
  private validatedPeriodKey({
    metric,
    periodStart,
  }: {
    metric: IsmsMetric;
    periodStart: string;
  }): string {
    if (!metric.cadence) {
      throw new BadRequestException(
        `Set a cadence on "${metric.name}" before recording measurements.`,
      );
    }
    const cadence = metric.cadence as MetricCadenceValue;
    const key = toPeriodKey(periodStart);
    if (!key || !isAlignedPeriodStart(cadence, key)) {
      throw new BadRequestException(
        `Invalid period for "${metric.name}": expected the first day of a ${
          cadence === 'monthly' ? 'month' : 'quarter'
        } (YYYY-MM-DD).`,
      );
    }
    if (key > periodStartFor(cadence, new Date())) {
      throw new BadRequestException(
        `Cannot record a future period for "${metric.name}".`,
      );
    }
    return key;
  }

  private async requireDocument({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId, type: 'monitoring' },
    });
    if (!document) {
      throw new NotFoundException('ISMS monitoring document not found');
    }
    return document;
  }

  private async requireMetricInDocument({
    metricId,
    documentId,
  }: {
    metricId: string;
    documentId: string;
  }) {
    const metric = await db.ismsMetric.findFirst({
      where: { id: metricId, documentId },
    });
    if (!metric) {
      throw new NotFoundException('Metric not found in document');
    }
    this.assertMetricActive(metric);
    return metric;
  }

  private async requireMeasurement({
    measurementId,
    organizationId,
  }: {
    measurementId: string;
    organizationId: string;
  }) {
    const measurement = await db.ismsMeasurement.findFirst({
      where: { id: measurementId, metric: { document: { organizationId } } },
    });
    if (!measurement) {
      throw new NotFoundException('Measurement not found');
    }
    return measurement;
  }
}
