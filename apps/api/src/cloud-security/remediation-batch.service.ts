import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { db } from '@db';
import { auth, runs } from '@trigger.dev/sdk';
import { z } from 'zod';
import { logCloudSecurityActivity } from './cloud-security-audit';
import {
  CreateRemediationBatchDto,
  UpdateRemediationBatchDto,
} from './dto/remediation-batch.dto';

const runPayloadSchema = z.object({
  batchId: z.string(),
  organizationId: z.string(),
  connectionId: z.string(),
});
const findingsSchema = z.array(
  z
    .object({
      id: z.string(),
      status: z.string(),
    })
    .catchall(z.json()),
);

@Injectable()
export class RemediationBatchService {
  async getActive(params: { connectionId: string; organizationId: string }) {
    return db.remediationBatch.findFirst({
      where: { ...params, status: { in: ['pending', 'running'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(params: {
    body: CreateRemediationBatchDto;
    organizationId: string;
    userId: string;
  }) {
    const { body, organizationId, userId } = params;
    const ids = body.findings.map((finding) => finding.id);
    if (ids.length === 0 || new Set(ids).size !== ids.length) {
      throw new BadRequestException('Provide distinct findings');
    }

    const batch = await db.$transaction(async (tx) => {
      const connection = await tx.integrationConnection.findFirst({
        where: { id: body.connectionId, organizationId, status: 'active' },
        select: { id: true },
      });
      if (!connection) throw new NotFoundException('Connection not found');

      const findings = await tx.integrationCheckResult.findMany({
        where: {
          id: { in: ids },
          checkRun: {
            connectionId: connection.id,
            connection: { organizationId },
          },
        },
        select: { id: true },
      });
      if (findings.length !== ids.length)
        throw new NotFoundException('Finding not found');

      return tx.remediationBatch.create({
        data: {
          connectionId: connection.id,
          organizationId,
          initiatedById: userId,
          status: 'pending',
          findings: body.findings.map((finding) => ({
            ...finding,
            status: 'pending',
          })),
        },
      });
    });

    await logCloudSecurityActivity({
      organizationId,
      userId,
      connectionId: batch.connectionId,
      action: 'remediation_executed',
      description: `Started batch fix: ${ids.length} findings`,
      metadata: { batchId: batch.id, findingCount: ids.length },
    });
    return batch;
  }

  async update(params: {
    batchId: string;
    organizationId: string;
    body: UpdateRemediationBatchDto;
  }) {
    const { batchId, organizationId, body } = params;
    const batch = await this.getOwned({ batchId, organizationId });
    if (
      (batch.status === 'cancelled' || batch.status === 'done') &&
      body.status &&
      body.status !== batch.status
    ) {
      throw new BadRequestException('Terminal batches cannot change status');
    }
    if (body.triggerRunId) {
      if (batch.triggerRunId && batch.triggerRunId !== body.triggerRunId) {
        throw new BadRequestException('Batch already has a run');
      }
      await this.validateRun({ batch, runId: body.triggerRunId });
    }

    const updated = await db.remediationBatch.updateMany({
      where: {
        id: batchId,
        organizationId,
        triggerRunId: batch.triggerRunId,
        status: batch.status,
      },
      data: {
        ...(body.triggerRunId && { triggerRunId: body.triggerRunId }),
        ...(body.status && { status: body.status }),
      },
    });
    if (updated.count !== 1)
      throw new ConflictException('Batch changed; reload before updating');
    return this.getOwned({ batchId, organizationId });
  }

  async cancel(params: {
    batchId: string;
    organizationId: string;
    runId: string;
  }) {
    const batch = await this.getOwned(params);
    const runId = batch.triggerRunId;
    if (!runId || runId !== params.runId) {
      throw new NotFoundException('Run not found');
    }
    if (batch.status === 'done' || batch.status === 'cancelled') return batch;
    await this.validateRun({ batch, runId });
    await this.withAppProject(() => runs.cancel(runId));
    const updated = await db.remediationBatch.updateMany({
      where: {
        id: batch.id,
        organizationId: batch.organizationId,
        triggerRunId: batch.triggerRunId,
        status: { in: ['pending', 'running'] },
      },
      data: { status: 'cancelled' },
    });
    const current = await this.getOwned(params);
    if (
      updated.count === 0 &&
      current.status !== 'done' &&
      current.status !== 'cancelled'
    ) {
      throw new ConflictException('Batch changed; reload before cancelling');
    }
    return current;
  }

  async skip(params: {
    batchId: string;
    organizationId: string;
    findingId: string;
  }) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const batch = await this.getOwned(params);
      if (batch.status === 'done' || batch.status === 'cancelled') {
        throw new BadRequestException('Batch is no longer active');
      }
      const findings = findingsSchema.parse(batch.findings);
      const target = findings.find(
        (finding) => finding.id === params.findingId,
      );
      if (!target) throw new NotFoundException('Finding not found');
      if (target.status !== 'pending') return { success: true };
      const updated = findings.map((finding) =>
        finding.id === params.findingId
          ? { ...finding, status: 'cancelled' }
          : finding,
      );
      const result = await db.remediationBatch.updateMany({
        where: {
          id: batch.id,
          organizationId: params.organizationId,
          status: batch.status,
          findings: { equals: findings },
        },
        data: { findings: updated },
      });
      if (result.count === 1) return { success: true };
    }
    throw new ConflictException('Batch changed; retry skipping the finding');
  }

  private async getOwned(params: { batchId: string; organizationId: string }) {
    const batch = await db.remediationBatch.findFirst({
      where: { id: params.batchId, organizationId: params.organizationId },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  private async validateRun(params: {
    batch: { id: string; organizationId: string; connectionId: string };
    runId: string;
  }) {
    const run = await this.withAppProject(() => runs.retrieve(params.runId));
    const payload = runPayloadSchema.safeParse(run.payload);
    if (
      run.taskIdentifier !== 'remediate-batch' ||
      !run.tags.includes(params.batch.organizationId) ||
      !payload.success ||
      payload.data.batchId !== params.batch.id ||
      payload.data.organizationId !== params.batch.organizationId ||
      payload.data.connectionId !== params.batch.connectionId
    ) {
      throw new NotFoundException('Run not found');
    }
  }

  private withAppProject<T>(action: () => Promise<T>) {
    const accessToken = process.env.TRIGGER_APP_SECRET_KEY;
    if (!accessToken) {
      throw new ServiceUnavailableException(
        'TRIGGER_APP_SECRET_KEY must be configured for the apps/app Trigger.dev project',
      );
    }
    return auth.withAuth({ accessToken }, action);
  }
}
